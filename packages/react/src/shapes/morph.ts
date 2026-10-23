/**
 * A morph between two rounded polygons.
 *
 * Adapted from Flutter's `material_ui` shapes (`shapes/morph.dart`), Copyright 2013 The Flutter
 * Authors, BSD-3-Clause, which is itself a port of the AndroidX `graphics-shapes` library,
 * Copyright 2022 The Android Open Source Project, Apache-2.0.
 *
 * Changes from the original: `toPath` is `toSvgPath`, an SVG path string.
 */

import { Cubic, cubicsToPath } from './cubic.js';
import { type DoubleMapper, featureMapper } from './mapping.js';
import { ANGLE_EPSILON, type Bounds, lerp, positiveModulo, unionBounds } from './math.js';
import { LengthMeasurer, type MeasuredCubic, MeasuredPolygon } from './polygon-measure.js';
import type { RoundedPolygon } from './rounded-polygon.js';

/**
 * An animation between two {@link RoundedPolygon}s.
 *
 * Morphing arbitrary shapes is hard because it is not clear how the points of one map to the
 * points of the other. Polygons make it tractable: each is one contiguous outline made only of
 * cubic Béziers, so two of them differ only in how many curves they have and where they are. A
 * morph works out how the curves map to each other (from how near the corners are, and whether
 * they are convex or concave), splitting curves where the shapes have different numbers or the
 * curves sit very differently.
 *
 * The matching is done once, when the morph is made, so make one and reuse it for every frame.
 */
export class Morph {
  readonly start: RoundedPolygon;
  readonly end: RoundedPolygon;
  private readonly morphMatch: readonly (readonly [Cubic, Cubic])[];

  constructor(start: RoundedPolygon, end: RoundedPolygon) {
    this.start = start;
    this.end = end;
    this.morphMatch = match(start, end);
  }

  calculateBounds(): Bounds {
    return unionBounds(this.start.calculateBounds(), this.end.calculateBounds());
  }

  calculateApproximateBounds(): Bounds {
    return unionBounds(
      this.start.calculateApproximateBounds(),
      this.end.calculateApproximateBounds(),
    );
  }

  /** A square that holds the morph at every progress, however it is turned. */
  calculateMaxBounds(): Bounds {
    return unionBounds(this.start.calculateMaxBounds(), this.end.calculateMaxBounds());
  }

  /**
   * The outline at `progress`: the start shape at 0, the end shape at 1. Values outside 0 to 1
   * overshoot, which is what a spring does.
   */
  toCubics(progress: number): Cubic[] {
    const matchCount = this.morphMatch.length;
    if (matchCount === 0) return [];

    // One cubic per matched pair. The last one ends where the first starts, exactly: anchors
    // that are a little off, even by far less than a pixel, can show as rendering artefacts.
    const [firstFrom, firstTo] = this.morphMatch[0] as readonly [Cubic, Cubic];
    const firstAnchor0X = lerp(firstFrom.anchor0X, firstTo.anchor0X, progress);
    const firstAnchor0Y = lerp(firstFrom.anchor0Y, firstTo.anchor0Y, progress);

    return this.morphMatch.map(([from, to], i) => {
      const isLast = i === matchCount - 1;
      return new Cubic(
        lerp(from.anchor0X, to.anchor0X, progress),
        lerp(from.anchor0Y, to.anchor0Y, progress),
        lerp(from.control0X, to.control0X, progress),
        lerp(from.control0Y, to.control0Y, progress),
        lerp(from.control1X, to.control1X, progress),
        lerp(from.control1Y, to.control1Y, progress),
        isLast ? firstAnchor0X : lerp(from.anchor1X, to.anchor1X, progress),
        isLast ? firstAnchor0Y : lerp(from.anchor1Y, to.anchor1Y, progress),
      );
    });
  }

  /** The outline at `progress` as an SVG path (`d` attribute). */
  toSvgPath(progress: number, precision?: number): string {
    return cubicsToPath(this.toCubics(progress), precision);
  }
}

function match(p1: RoundedPolygon, p2: RoundedPolygon): readonly (readonly [Cubic, Cubic])[] {
  // Measure both polygons: lists of measured cubics, which are what the start and end curves
  // are matched from.
  const measuredPolygon1 = MeasuredPolygon.measure(new LengthMeasurer(), p1);
  const measuredPolygon2 = MeasuredPolygon.measure(new LengthMeasurer(), p2);

  // The corners (just the inner circular curve) with the progress at their middle: the values
  // the two polygons are compared and matched by.
  const features1 = measuredPolygon1.features;
  const features2 = measuredPolygon2.features;

  // Map each feature of one shape to the closest in the other. From a progress in one shape,
  // the result gives the matching progress in the other, either way round.
  const doubleMapper: DoubleMapper = featureMapper(features1, features2);

  // The cut point on polygon 2 is where progress 0 of polygon 1 maps to.
  const polygon2CutPoint = doubleMapper.map(0);

  // Both polygons start at progress 0, and the mapper has decided to match 0 on the first to
  // `polygon2CutPoint` on the second. So cut the second there and rotate it: walking both, the
  // matching cubics come in step. The measured cubics of both run from 0 up to 1.
  const bs1 = measuredPolygon1;
  const bs2 = measuredPolygon2.cutAndShift(polygon2CutPoint);

  // Compare the two lists of measured cubics, making pairs: the start and end curves of the
  // morph, which can be interpolated to animate between the shapes.
  const ret: (readonly [Cubic, Cubic])[] = [];

  // The index of the current cubic of the start (1) and end (2) shape, and the cubic itself.
  let i1 = 0;
  let i2 = 0;
  let b1: MeasuredCubic | undefined = bs1.cubicAtOrNull(i1++);
  let b2: MeasuredCubic | undefined = bs2.cubicAtOrNull(i2++);

  // Until every curve is accounted for.
  while (b1 && b2) {
    // Progress is from the first shape's point of view: where the current cubics end, 0 to 1.
    const b1a = i1 === bs1.length ? 1 : b1.endOutlineProgress;
    const b2a =
      i2 === bs2.length
        ? 1
        : doubleMapper.mapBack(positiveModulo(b2.endOutlineProgress + polygon2CutPoint, 1));
    // The progress at which whichever curve ends first ends. If both end about there, no cut is
    // needed and they match; a curve that goes on past it is cut.
    const minb = Math.min(b1a, b2a);

    let seg1: MeasuredCubic;
    let newb1: MeasuredCubic | undefined;
    if (b1a > minb + ANGLE_EPSILON) [seg1, newb1] = b1.cutAtProgress(minb);
    else [seg1, newb1] = [b1, bs1.cubicAtOrNull(i1++)];

    let seg2: MeasuredCubic;
    let newb2: MeasuredCubic | undefined;
    if (b2a > minb + ANGLE_EPSILON) {
      [seg2, newb2] = b2.cutAtProgress(
        positiveModulo(doubleMapper.map(minb) - polygon2CutPoint, 1),
      );
    } else [seg2, newb2] = [b2, bs2.cubicAtOrNull(i2++)];

    ret.push([seg1.cubic, seg2.cubic]);
    b1 = newb1;
    b2 = newb2;
  }

  if (b1 || b2) throw new Error("Expected both polygons' cubics to be fully matched");
  return ret;
}
