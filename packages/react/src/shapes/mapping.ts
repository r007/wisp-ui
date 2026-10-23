/**
 * Mapping progress along one outline to progress along another, which is how a morph decides
 * which features of one shape become which features of the other.
 *
 * Adapted from Flutter's `material_ui` shapes (`shapes/double_mapping.dart`,
 * `shapes/feature_mapping.dart`), Copyright 2013 The Flutter Authors, BSD-3-Clause, which is
 * itself a port of the AndroidX `graphics-shapes` library, Copyright 2022 The Android Open Source
 * Project, Apache-2.0.
 */

import type { Cubic } from './cubic.js';
import type { PolygonFeature } from './features.js';
import {
  binarySearchBy,
  DISTANCE_EPSILON,
  distanceSquared,
  type Point,
  point,
  positiveModulo,
  subtract,
} from './math.js';

/** Whether `progress` is in the range from `from` to `to`, which may wrap round past 1. */
export function progressInRange(progress: number, from: number, to: number): boolean {
  if (to >= from) return progress >= from && progress <= to;
  return progress >= from || progress <= to;
}

/** The distance between two progress values on a closed outline: the shorter way round. */
export function progressDistance(p1: number, p2: number): number {
  const diff = Math.abs(p1 - p2);
  return Math.min(diff, 1 - diff);
}

/**
 * Maps `x` (0 to 1) through the piecewise linear function that takes each of `xValues` to the
 * `yValues` at the same index. The values are progress along a closed outline, so the last
 * segment wraps back to the first.
 */
export function linearMap(
  xValues: readonly number[],
  yValues: readonly number[],
  x: number,
): number {
  if (!(x >= 0 && x <= 1)) throw new RangeError(`Invalid progress ${x}`);
  let segmentStartIndex = -1;
  for (let i = 0; i < xValues.length; i++) {
    if (progressInRange(x, xValues[i] as number, xValues[(i + 1) % xValues.length] as number)) {
      segmentStartIndex = i;
      break;
    }
  }
  if (segmentStartIndex === -1) throw new Error('segmentStartIndex not found.');
  const segmentEndIndex = (segmentStartIndex + 1) % xValues.length;
  const segmentSizeX = positiveModulo(
    (xValues[segmentEndIndex] as number) - (xValues[segmentStartIndex] as number),
    1,
  );
  const segmentSizeY = positiveModulo(
    (yValues[segmentEndIndex] as number) - (yValues[segmentStartIndex] as number),
    1,
  );
  const positionInSegment =
    segmentSizeX < 0.001
      ? 0.5
      : positiveModulo(x - (xValues[segmentStartIndex] as number), 1) / segmentSizeX;
  return positiveModulo(
    (yValues[segmentStartIndex] as number) + segmentSizeY * positionInSegment,
    1,
  );
}

/** Throws unless `p` is a usable list of progress values: in [0, 1), distinct, wrapping at most once. */
export function validateProgress(p: readonly number[]): void {
  if (p.length === 0) throw new RangeError('List is empty.');
  let prev = p[p.length - 1] as number;
  let wraps = 0;
  for (const curr of p) {
    if (curr < 0 || curr >= 1) throw new RangeError(`Progress outside of range: ${p.join(', ')}`);
    if (progressDistance(curr, prev) <= DISTANCE_EPSILON) {
      throw new RangeError(`Progress repeats a value: ${p.join(', ')}`);
    }
    if (curr < prev) {
      wraps++;
      if (wraps > 1) throw new RangeError(`Progress wraps more than once: ${p.join(', ')}`);
    }
    prev = curr;
  }
}

/** A mapping between two outlines' progress, given by pairs of (source, target) values. */
export class DoubleMapper {
  private readonly sourceValues: number[];
  private readonly targetValues: number[];

  constructor(mappings: readonly (readonly [number, number])[]) {
    this.sourceValues = mappings.map(([source]) => source);
    this.targetValues = mappings.map(([, target]) => target);
    validateProgress(this.sourceValues);
    validateProgress(this.targetValues);
  }

  /** The mapping that changes nothing. */
  static identity(): DoubleMapper {
    // Any two points on the diagonal define it; spread apart to keep rounding errors small.
    return new DoubleMapper([
      [0, 0],
      [0.5, 0.5],
    ]);
  }

  map(x: number): number {
    return linearMap(this.sourceValues, this.targetValues, x);
  }

  mapBack(x: number): number {
    return linearMap(this.targetValues, this.sourceValues, x);
  }
}

/** A feature and where along its outline (0 to 1) it is. */
export interface ProgressableFeature {
  readonly progress: number;
  readonly feature: PolygonFeature;
}

interface DistanceVertex {
  readonly distance: number;
  readonly f1: ProgressableFeature;
  readonly f2: ProgressableFeature;
}

/**
 * The mapping between the progress of two outlines, built from their corners: each corner of one
 * is paired with the nearest unused corner of the other that bends the same way.
 */
export function featureMapper(
  features1: readonly ProgressableFeature[],
  features2: readonly ProgressableFeature[],
): DoubleMapper {
  // Only corners count.
  const filtered1 = features1.filter((f) => f.feature.isCorner);
  const filtered2 = features2.filter((f) => f.feature.isCorner);
  return new DoubleMapper(doMapping(filtered1, filtered2));
}

export function doMapping(
  features1: readonly ProgressableFeature[],
  features2: readonly ProgressableFeature[],
): readonly (readonly [number, number])[] {
  const distanceVertexList: DistanceVertex[] = [];
  for (const f1 of features1) {
    for (const f2 of features2) {
      const d = featureDistSquared(f1.feature, f2.feature);
      if (d !== Number.MAX_VALUE) distanceVertexList.push({ distance: d, f1, f2 });
    }
  }
  // Nearest pairs first. The sort is stable, so ties keep the order the features came in.
  distanceVertexList.sort((a, b) => a.distance - b.distance);

  const helper = new MappingHelper();
  for (const d of distanceVertexList) helper.addMapping(d.f1, d.f2);

  // A mapping needs at least two pairs to be valid.
  if (helper.mapping.length === 0) {
    // No pair was usable: the identity mapping.
    return [
      [0, 0],
      [0.5, 0.5],
    ];
  }
  if (helper.mapping.length === 1) {
    // All but one pair were rejected: invent a second half a turn away on both shapes.
    const [f1, f2] = helper.mapping[0] as readonly [number, number];
    return [
      [f1, f2],
      [(f1 + 0.5) % 1, (f2 + 0.5) % 1],
    ];
  }
  return helper.mapping;
}

class MappingHelper {
  /** Mappings from progress in the start shape to progress in the end shape, sorted by the first. */
  readonly mapping: (readonly [number, number])[] = [];
  private readonly usedF1 = new Set<ProgressableFeature>();
  private readonly usedF2 = new Set<ProgressableFeature>();

  addMapping(f1: ProgressableFeature, f2: ProgressableFeature): void {
    // A feature is mapped once.
    if (this.usedF1.has(f1) || this.usedF2.has(f2)) return;

    // The list is sorted: find where this mapping goes.
    const index = binarySearchBy(this.mapping, (it) => it[0], f1.progress);
    // Two features at exactly the same progress (sharp corners at a repeated vertex) can't both
    // be mapped. The first to get here took the spot.
    if (index >= 0) return;
    const insertionIndex = -index - 1;
    const n = this.mapping.length;

    // The first element can always be added.
    if (n >= 1) {
      const [before1, before2] = this.mapping[(insertionIndex + n - 1) % n] as readonly [
        number,
        number,
      ];
      const [after1, after2] = this.mapping[insertionIndex % n] as readonly [number, number];

      // Features too close together would make the DoubleMapper unstable (and fail validation).
      if (
        progressDistance(f1.progress, before1) <= DISTANCE_EPSILON ||
        progressDistance(f1.progress, after1) <= DISTANCE_EPSILON ||
        progressDistance(f2.progress, before2) <= DISTANCE_EPSILON ||
        progressDistance(f2.progress, after2) <= DISTANCE_EPSILON
      ) {
        return;
      }

      // With two or more elements, make sure this does not add crossings.
      if (n > 1 && !progressInRange(f2.progress, before2, after2)) return;
    }

    this.mapping.splice(insertionIndex, 0, [f1.progress, f2.progress]);
    this.usedF1.add(f1);
    this.usedF2.add(f2);
  }
}

/** The squared distance between two features' representative points; huge if they bend differently. */
export function featureDistSquared(f1: PolygonFeature, f2: PolygonFeature): number {
  if (f1.isCorner && f2.isCorner && f1.isConvexCorner !== f2.isConvexCorner) {
    // Forces features to map only to those of the same concavity.
    return Number.MAX_VALUE;
  }
  return distanceSquared(subtract(featureRepresentativePoint(f1), featureRepresentativePoint(f2)));
}

/** The midpoint between the first anchor and the last: a point to stand for the whole feature. */
export function featureRepresentativePoint(feature: PolygonFeature): Point {
  const cubics: readonly Cubic[] = feature.cubics;
  const first = cubics[0] as Cubic;
  const last = cubics[cubics.length - 1] as Cubic;
  return point((first.anchor0X + last.anchor1X) / 2, (first.anchor0Y + last.anchor1Y) / 2);
}
