/**
 * A single cubic Bézier curve, and what an outline made of them needs.
 *
 * Adapted from Flutter's `material_ui` shapes (`shapes/cubic.dart`), Copyright 2013 The Flutter
 * Authors, BSD-3-Clause, which is itself a port of the AndroidX `graphics-shapes` library,
 * Copyright 2022 The Android Open Source Project, Apache-2.0.
 *
 * Changes from the original: the curve class is `Cubic`; paths are SVG path strings
 * (`cubicsToPath`) instead of Flutter `Path` objects, and the `startAngle` and `repeatPath`
 * options, which serve Flutter's star-shaped progress indicator, are left out.
 */

import {
  type Bounds,
  DISTANCE_EPSILON,
  dot,
  isConvex,
  lerp,
  type Point,
  type PointTransformer,
  point,
  rotate90,
  subtract,
  unit,
} from './math.js';

/**
 * A cubic Bézier curve from `anchor0` to `anchor1`; the control points shape its slope at each
 * end. Immutable.
 */
export class Cubic {
  readonly anchor0X: number;
  readonly anchor0Y: number;
  readonly control0X: number;
  readonly control0Y: number;
  readonly control1X: number;
  readonly control1Y: number;
  readonly anchor1X: number;
  readonly anchor1Y: number;

  constructor(
    anchor0X: number,
    anchor0Y: number,
    control0X: number,
    control0Y: number,
    control1X: number,
    control1Y: number,
    anchor1X: number,
    anchor1Y: number,
  ) {
    this.anchor0X = anchor0X;
    this.anchor0Y = anchor0Y;
    this.control0X = control0X;
    this.control0Y = control0Y;
    this.control1X = control1X;
    this.control1Y = control1Y;
    this.anchor1X = anchor1X;
    this.anchor1Y = anchor1Y;
  }

  /** A curve from four points. */
  static of(anchor0: Point, control0: Point, control1: Point, anchor1: Point): Cubic {
    return new Cubic(
      anchor0.x,
      anchor0.y,
      control0.x,
      control0.y,
      control1.x,
      control1.y,
      anchor1.x,
      anchor1.y,
    );
  }

  /** A straight line between `p0` and `p1`, its control points a third of the way along. */
  static straightLine(p0: Point, p1: Point): Cubic {
    return new Cubic(
      p0.x,
      p0.y,
      lerp(p0.x, p1.x, 1 / 3),
      lerp(p0.y, p1.y, 1 / 3),
      lerp(p0.x, p1.x, 2 / 3),
      lerp(p0.y, p1.y, 2 / 3),
      p1.x,
      p1.y,
    );
  }

  /**
   * A curve approximating the circular arc around `center` from `p0` to `p1`: the smaller of the
   * two arcs. Use more than one for an arc of over 180 degrees. `p0` and `p1` should be the same
   * distance from `center`.
   */
  static circularArc(center: Point, p0: Point, p1: Point): Cubic {
    const p0FromCenter = subtract(p0, center);
    const p1FromCenter = subtract(p1, center);
    const p0d = unit(p0FromCenter);
    const p1d = unit(p1FromCenter);
    const rotatedP0 = rotate90(p0d);
    const rotatedP1 = rotate90(p1d);
    const clockwise = dot(rotatedP0, p1FromCenter) >= 0;
    const cosa = dot(p0d, p1d);

    // p0 ~= p1
    if (cosa > 0.999) return Cubic.straightLine(p0, p1);

    const k =
      ((Math.hypot(p0FromCenter.x, p0FromCenter.y) * 4) / 3) *
      ((Math.sqrt(2 * (1 - cosa)) - Math.sqrt(1 - cosa * cosa)) / (1 - cosa)) *
      (clockwise ? 1 : -1);

    return new Cubic(
      p0.x,
      p0.y,
      p0.x + rotatedP0.x * k,
      p0.y + rotatedP0.y * k,
      p1.x - rotatedP1.x * k,
      p1.y - rotatedP1.y * k,
      p1.x,
      p1.y,
    );
  }

  /** A curve of no length, all four points at `at`. */
  static point(at: Point): Cubic {
    return new Cubic(at.x, at.y, at.x, at.y, at.x, at.y, at.x, at.y);
  }

  get anchor0(): Point {
    return point(this.anchor0X, this.anchor0Y);
  }

  get anchor1(): Point {
    return point(this.anchor1X, this.anchor1Y);
  }

  /** The X coordinate of the point at `t`: 0 at `anchor0`, 1 at `anchor1`. */
  pointAtX(t: number): number {
    const u = 1 - t;
    return (
      this.anchor0X * (u * u * u) +
      this.control0X * (3 * t * u * u) +
      this.control1X * (3 * t * t * u) +
      this.anchor1X * (t * t * t)
    );
  }

  /** The Y coordinate of the point at `t`: 0 at `anchor0`, 1 at `anchor1`. */
  pointAtY(t: number): number {
    const u = 1 - t;
    return (
      this.anchor0Y * (u * u * u) +
      this.control0Y * (3 * t * u * u) +
      this.control1Y * (3 * t * t * u) +
      this.anchor1Y * (t * t * t)
    );
  }

  pointAt(t: number): Point {
    return point(this.pointAtX(t), this.pointAtY(t));
  }

  /** Whether the two anchors coincide (within a tolerance), so the curve adds nothing to an outline. */
  get isZeroLength(): boolean {
    return (
      Math.abs(this.anchor0X - this.anchor1X) < DISTANCE_EPSILON &&
      Math.abs(this.anchor0Y - this.anchor1Y) < DISTANCE_EPSILON
    );
  }

  /** Whether the corner formed by this curve and `next` turns convexly. */
  convexTo(next: Cubic): boolean {
    return isConvex(this.anchor0, this.anchor1, next.anchor1);
  }

  /**
   * The curve's axis-aligned bounding box. With `approximate`, the box of the anchors and
   * control points instead of the curve's true extrema: cheaper, never smaller, sometimes larger.
   */
  calculateBounds(approximate = false): Bounds {
    // A zero-length curve is just its point.
    if (this.isZeroLength) {
      return {
        left: this.anchor0X,
        top: this.anchor0Y,
        right: this.anchor0X,
        bottom: this.anchor0Y,
      };
    }

    let minX = Math.min(this.anchor0X, this.anchor1X);
    let minY = Math.min(this.anchor0Y, this.anchor1Y);
    let maxX = Math.max(this.anchor0X, this.anchor1X);
    let maxY = Math.max(this.anchor0Y, this.anchor1Y);

    if (approximate) {
      return {
        left: Math.min(minX, this.control0X, this.control1X),
        top: Math.min(minY, this.control0Y, this.control1Y),
        right: Math.max(maxX, this.control0X, this.control1X),
        bottom: Math.max(maxY, this.control0Y, this.control1Y),
      };
    }

    // The derivative is a quadratic Bézier: solve it for t with the quadratic formula, once per
    // axis.
    const extend = (
      a0: number,
      c0: number,
      c1: number,
      a1: number,
      at: (t: number) => number,
      lo: number,
      hi: number,
    ): readonly [number, number] => {
      const qa = -a0 + 3 * c0 - 3 * c1 + a1;
      const qb = 2 * a0 - 4 * c0 + 2 * c1;
      const qc = -a0 + c0;
      const consider = (t: number) => {
        if (t >= 0 && t <= 1) {
          const v = at(t);
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      };
      if (Math.abs(qa) < DISTANCE_EPSILON) {
        // The quadratic is linear, so there is a single root.
        if (qb !== 0) consider((2 * qc) / (-2 * qb));
      } else {
        const discriminant = qb * qb - 4 * qa * qc;
        if (discriminant >= 0) {
          const root = Math.sqrt(discriminant);
          consider((-qb + root) / (2 * qa));
          consider((-qb - root) / (2 * qa));
        }
      }
      return [lo, hi];
    };

    [minX, maxX] = extend(
      this.anchor0X,
      this.control0X,
      this.control1X,
      this.anchor1X,
      (t) => this.pointAtX(t),
      minX,
      maxX,
    );
    [minY, maxY] = extend(
      this.anchor0Y,
      this.control0Y,
      this.control1Y,
      this.anchor1Y,
      (t) => this.pointAtY(t),
      minY,
      maxY,
    );
    return { left: minX, top: minY, right: maxX, bottom: maxY };
  }

  /** Two curves that together are this one, split at `t`. */
  split(t: number): readonly [Cubic, Cubic] {
    const u = 1 - t;
    const at = this.pointAt(t);
    return [
      new Cubic(
        this.anchor0X,
        this.anchor0Y,
        this.anchor0X * u + this.control0X * t,
        this.anchor0Y * u + this.control0Y * t,
        this.anchor0X * (u * u) + this.control0X * (2 * u * t) + this.control1X * (t * t),
        this.anchor0Y * (u * u) + this.control0Y * (2 * u * t) + this.control1Y * (t * t),
        at.x,
        at.y,
      ),
      new Cubic(
        at.x,
        at.y,
        this.control0X * (u * u) + this.control1X * (2 * u * t) + this.anchor1X * (t * t),
        this.control0Y * (u * u) + this.control1Y * (2 * u * t) + this.anchor1Y * (t * t),
        this.control1X * u + this.anchor1X * t,
        this.control1Y * u + this.anchor1Y * t,
        this.anchor1X,
        this.anchor1Y,
      ),
    ];
  }

  /** This curve run backwards, from `anchor1` to `anchor0`. */
  get reversed(): Cubic {
    return new Cubic(
      this.anchor1X,
      this.anchor1Y,
      this.control1X,
      this.control1Y,
      this.control0X,
      this.control0Y,
      this.anchor0X,
      this.anchor0Y,
    );
  }

  /** A copy with `transformer` applied to each anchor and control point. */
  transformed(transformer: PointTransformer): Cubic {
    const [a0X, a0Y] = transformer(this.anchor0X, this.anchor0Y);
    const [c0X, c0Y] = transformer(this.control0X, this.control0Y);
    const [c1X, c1Y] = transformer(this.control1X, this.control1Y);
    const [a1X, a1Y] = transformer(this.anchor1X, this.anchor1Y);
    return new Cubic(a0X, a0Y, c0X, c0Y, c1X, c1Y, a1X, a1Y);
  }

  equals(other: Cubic): boolean {
    return (
      other.anchor0X === this.anchor0X &&
      other.anchor0Y === this.anchor0Y &&
      other.control0X === this.control0X &&
      other.control0Y === this.control0Y &&
      other.control1X === this.control1X &&
      other.control1Y === this.control1Y &&
      other.anchor1X === this.anchor1X &&
      other.anchor1Y === this.anchor1Y
    );
  }
}

/**
 * An SVG path (`d` attribute) for a closed outline of `cubics`, each of which starts where the
 * one before ends. Coordinates are rounded to `precision` decimals.
 */
export function cubicsToPath(cubics: readonly Cubic[], precision = 4): string {
  const first = cubics[0];
  if (!first) return '';
  const n = (value: number) => String(Number(value.toFixed(precision)));
  let d = `M${n(first.anchor0X)} ${n(first.anchor0Y)}`;
  for (const c of cubics) {
    d += `C${n(c.control0X)} ${n(c.control0Y)} ${n(c.control1X)} ${n(c.control1Y)} ${n(c.anchor1X)} ${n(c.anchor1Y)}`;
  }
  return `${d}Z`;
}
