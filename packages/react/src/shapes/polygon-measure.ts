/**
 * A polygon's outline measured, so that progress along it (0 to 1) can be turned into a point.
 *
 * Adapted from Flutter's `material_ui` shapes (`shapes/polygon_measure.dart`), Copyright 2013 The
 * Flutter Authors, BSD-3-Clause, which is itself a port of the AndroidX `graphics-shapes`
 * library, Copyright 2022 The Android Open Source Project, Apache-2.0.
 */

import type { Cubic } from './cubic.js';
import type { PolygonFeature } from './features.js';
import type { ProgressableFeature } from './mapping.js';
import { DISTANCE_EPSILON, positiveModulo } from './math.js';
import type { RoundedPolygon } from './rounded-polygon.js';

/** Measures cubics, and finds the point on one that is a given measure along it. */
export interface Measurer {
  measureCubic(cubic: Cubic): number;
  findCubicCutPoint(cubic: Cubic, measure: number): number;
}

/** Measures by arc length, estimated from a few straight segments. */
export class LengthMeasurer implements Measurer {
  // The fewest segments that give up to 98.5% of the true arc length.
  private static readonly SEGMENTS = 3;

  measureCubic(cubic: Cubic): number {
    return this.closestProgressTo(cubic, Number.POSITIVE_INFINITY)[1];
  }

  findCubicCutPoint(cubic: Cubic, measure: number): number {
    return this.closestProgressTo(cubic, measure)[0];
  }

  private closestProgressTo(cubic: Cubic, threshold: number): readonly [number, number] {
    if (threshold <= 0) return [0, 0];
    const segments = LengthMeasurer.SEGMENTS;
    let total = 0;
    let remainder = threshold;
    let prevX = cubic.anchor0X;
    let prevY = cubic.anchor0Y;
    for (let i = 1; i <= segments; i++) {
      const progress = i / segments;
      const x = cubic.pointAtX(progress);
      const y = cubic.pointAtY(progress);
      const dx = x - prevX;
      const dy = y - prevY;
      const segment = Math.sqrt(dx * dx + dy * dy);
      if (segment >= remainder) {
        return [progress - (1 - remainder / segment) / segments, threshold];
      }
      remainder -= segment;
      total += segment;
      prevX = x;
      prevY = y;
    }
    return [1, total];
  }
}

/** A cubic with the stretch of the outline (as progress, 0 to 1) that it covers. */
export class MeasuredCubic {
  readonly measurer: Measurer;
  readonly cubic: Cubic;
  readonly measuredSize: number;
  private startProgress: number;
  private endProgress: number;

  constructor(measurer: Measurer, cubic: Cubic, startProgress: number, endProgress: number) {
    if (!(startProgress >= 0 && startProgress <= 1)) {
      throw new RangeError('startOutlineProgress has to be in [0..1] range');
    }
    if (!(endProgress >= 0 && endProgress <= 1)) {
      throw new RangeError('endOutlineProgress has to be in range [0..1]');
    }
    if (endProgress < startProgress) {
      throw new RangeError(
        'endOutlineProgress is expected to be equal or greater than startOutlineProgress',
      );
    }
    this.measurer = measurer;
    this.cubic = cubic;
    this.startProgress = startProgress;
    this.endProgress = endProgress;
    this.measuredSize = measurer.measureCubic(cubic);
  }

  get startOutlineProgress(): number {
    return this.startProgress;
  }

  get endOutlineProgress(): number {
    return this.endProgress;
  }

  updateProgressRange(range: { start?: number; end?: number }): void {
    const start = range.start ?? this.startProgress;
    const end = range.end ?? this.endProgress;
    if (end < start) {
      throw new RangeError(
        'endOutlineProgress is expected to be equal or greater than startOutlineProgress',
      );
    }
    this.startProgress = start;
    this.endProgress = end;
  }

  /** The two parts of this cubic either side of a point at `cutOutlineProgress` of the outline. */
  cutAtProgress(cutOutlineProgress: number): readonly [MeasuredCubic, MeasuredCubic] {
    // Rounding errors can put the cut slightly outside this cubic's range: keep it inside.
    const bounded = Math.min(Math.max(cutOutlineProgress, this.startProgress), this.endProgress);
    const outlineProgressSize = this.endProgress - this.startProgress;
    const progressFromStart = bounded - this.startProgress;
    // Cubics with no progress size were filtered out before this is called.
    const relativeProgress = progressFromStart / outlineProgressSize;
    const t = this.measurer.findCubicCutPoint(this.cubic, relativeProgress * this.measuredSize);
    if (t < 0 || t > 1) throw new RangeError('Cubic cut point is expected to be between 0 and 1.');
    const [c1, c2] = this.cubic.split(t);
    return [
      new MeasuredCubic(this.measurer, c1, this.startProgress, bounded),
      new MeasuredCubic(this.measurer, c2, bounded, this.endProgress),
    ];
  }
}

/** A polygon's cubics, each with the stretch of the outline it covers, and its corners located. */
export class MeasuredPolygon {
  readonly features: readonly ProgressableFeature[];
  private readonly measurer: Measurer;
  private readonly cubics: readonly MeasuredCubic[];

  private constructor(
    measurer: Measurer,
    features: readonly ProgressableFeature[],
    cubics: readonly Cubic[],
    outlineProgress: readonly number[],
  ) {
    this.measurer = measurer;
    this.features = features;
    if (outlineProgress.length !== cubics.length + 1) {
      throw new RangeError('Outline progress length is expected to be the cubics length + 1');
    }
    if (outlineProgress[0] !== 0)
      throw new RangeError('First outline progress value is expected to be zero');
    if (outlineProgress[outlineProgress.length - 1] !== 1) {
      throw new RangeError('Last outline progress value is expected to be one');
    }

    const measured: MeasuredCubic[] = [];
    let startOutlineProgress = 0;
    for (let i = 0; i < cubics.length; i++) {
      // Leave out empty cubics.
      if ((outlineProgress[i + 1] as number) - (outlineProgress[i] as number) > DISTANCE_EPSILON) {
        measured.push(
          new MeasuredCubic(
            measurer,
            cubics[i] as Cubic,
            startOutlineProgress,
            outlineProgress[i + 1] as number,
          ),
        );
        // The next one starts exactly where this one ends.
        startOutlineProgress = outlineProgress[i + 1] as number;
      }
    }
    // Empty cubics at the end may have been dropped: the last one must still end at 1.
    (measured[measured.length - 1] as MeasuredCubic).updateProgressRange({ end: 1 });
    this.cubics = measured;
  }

  static measure(measurer: Measurer, polygon: RoundedPolygon): MeasuredPolygon {
    const cubics: Cubic[] = [];
    const featureToCubic: (readonly [PolygonFeature, number])[] = [];

    // Collect the cubics, noting for each corner the one that stands for it.
    for (const feature of polygon.features) {
      const featureCubics = feature.cubics;
      for (let cubicIndex = 0; cubicIndex < featureCubics.length; cubicIndex++) {
        if (feature.isCorner && cubicIndex === Math.trunc(featureCubics.length / 2)) {
          featureToCubic.push([feature, cubics.length]);
        }
        cubics.push(featureCubics[cubicIndex] as Cubic);
      }
    }

    const measures = new Array<number>(cubics.length + 1).fill(0);
    let totalMeasure = 0;
    for (let i = 0; i < cubics.length; i++) {
      const measure = measurer.measureCubic(cubics[i] as Cubic);
      if (measure < 0)
        throw new RangeError('Measured cubic is expected to be greater or equal to zero');
      totalMeasure += measure;
      measures[i + 1] = totalMeasure;
    }

    const outlineProgress = new Array<number>(measures.length).fill(0);
    if (totalMeasure < DISTANCE_EPSILON) {
      // A degenerate polygon (all its points together) has no outline to divide by: space the
      // cubics evenly instead, so it can still be morphed.
      for (let i = 0; i < measures.length; i++) outlineProgress[i] = i / cubics.length;
    } else {
      for (let i = 0; i < measures.length; i++) {
        outlineProgress[i] = (measures[i] as number) / totalMeasure;
      }
    }

    const features: ProgressableFeature[] = featureToCubic.map(([feature, ix]) => ({
      progress: positiveModulo(
        ((outlineProgress[ix] as number) + (outlineProgress[ix + 1] as number)) / 2,
        1,
      ),
      feature,
    }));

    return new MeasuredPolygon(measurer, features, cubics, outlineProgress);
  }

  get length(): number {
    return this.cubics.length;
  }

  get first(): MeasuredCubic {
    return this.cubics[0] as MeasuredCubic;
  }

  get last(): MeasuredCubic {
    return this.cubics[this.cubics.length - 1] as MeasuredCubic;
  }

  at(index: number): MeasuredCubic {
    return this.cubics[index] as MeasuredCubic;
  }

  /** The measured cubic at `index`, or undefined when there is none. */
  cubicAtOrNull(index: number): MeasuredCubic | undefined {
    return this.cubics[index];
  }

  /**
   * This polygon cut at `cuttingPoint` (0 to 1) and rotated, so that the point becomes the start
   * of the outline.
   */
  cutAndShift(cuttingPoint: number): MeasuredPolygon {
    if (cuttingPoint < 0 || cuttingPoint > 1) {
      throw new RangeError('Cutting point is expected to be between 0 and 1');
    }
    if (cuttingPoint < DISTANCE_EPSILON) return this;

    // The cubic to cut.
    const targetIndex = this.cubics.findIndex(
      (c) => cuttingPoint >= c.startOutlineProgress && cuttingPoint <= c.endOutlineProgress,
    );
    const target = this.cubics[targetIndex] as MeasuredCubic;
    // b1 and b2 are the cubics either side of the cut.
    const [b1, b2] = target.cutAtProgress(cuttingPoint);

    // The cubics we want, in order: the part of the target after the cut; every cubic after the
    // target, to the end, then those from the start up to the target; and the part of the target
    // before the cut.
    const retCubics: Cubic[] = [b2.cubic];
    for (let i = 1; i < this.cubics.length; i++) {
      retCubics.push((this.cubics[(i + targetIndex) % this.cubics.length] as MeasuredCubic).cubic);
    }
    retCubics.push(b1.cubic);

    // Their outline progress. With three cubics covering [0, .3], [.3, .8] and [.8, 1], cut at .6,
    // the progress starts at 0 (the cut, which becomes the start), then .8 - .6 = .2, then
    // 1 - .6 = .4, then .3 - .6 + 1 = .7, then 1 (the cut again): (0, .2, .4, .7, 1).
    const retOutlineProgress = new Array<number>(this.cubics.length + 2).fill(0);
    for (let i = 0; i < this.cubics.length + 2; i++) {
      if (i === 0) retOutlineProgress[i] = 0;
      else if (i === this.cubics.length + 1) retOutlineProgress[i] = 1;
      else {
        const cubicIndex = (targetIndex + i - 1) % this.cubics.length;
        let progress = positiveModulo(
          (this.cubics[cubicIndex] as MeasuredCubic).endOutlineProgress - cuttingPoint,
          1,
        );
        // Only the first cubic may end at 0. For any other, 0 means its end was a rounding error
        // short of the cut and wrapped round: it ends at 1, or it would be dropped as empty.
        if (i > 1 && progress === 0) progress = 1;
        retOutlineProgress[i] = progress;
      }
    }

    // Shift the features' progress too.
    const newFeatures: ProgressableFeature[] = this.features.map((f) => ({
      progress: positiveModulo(f.progress - cuttingPoint, 1),
      feature: f.feature,
    }));

    return new MeasuredPolygon(this.measurer, newFeatures, retCubics, retOutlineProgress);
  }
}
