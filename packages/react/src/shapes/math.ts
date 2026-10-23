/**
 * Points and the small amount of vector arithmetic the shape algorithms need.
 *
 * Adapted from Flutter's `material_ui` shapes (`shapes/point.dart`, `shapes/utils.dart`),
 * Copyright 2013 The Flutter Authors, BSD-3-Clause, which is itself a port of the AndroidX
 * `graphics-shapes` library, Copyright 2022 The Android Open Source Project, Apache-2.0.
 *
 * Changes from the original: plain `{ x, y }` objects and functions instead of Flutter's `Offset`
 * and its extensions, and no Flutter or `dart:ui` types.
 */

/** A two dimensional coordinate pair. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A rectangle given by its edges. */
export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Transforms the point (x, y) and returns the transformed coordinates. */
export type PointTransformer = (x: number, y: number) => readonly [x: number, y: number];

export const ORIGIN: Point = { x: 0, y: 0 };

// These epsilon values decide when two points are the same, within some reasonable roundoff
// error. The distance epsilon is small enough that the roundoff is far below a pixel on any
// reasonably sized display.
export const DISTANCE_EPSILON = 1e-5;
export const ANGLE_EPSILON = 1e-6;

export const point = (x: number, y: number): Point => ({ x, y });
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Point, factor: number): Point => ({ x: a.x * factor, y: a.y * factor });
export const divide = (a: Point, divisor: number): Point => ({
  x: a.x / divisor,
  y: a.y / divisor,
});

export const distance = (a: Point): number => Math.hypot(a.x, a.y);
export const distanceSquared = (a: Point): number => a.x * a.x + a.y * a.y;
export const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;

/** A quarter turn around (0, 0), taking (x, y) to (-y, x). */
export const rotate90 = (a: Point): Point => ({ x: -a.y, y: a.x });

/** `a` turned by `degrees` around `center`. */
export function rotate(a: Point, degrees: number, center: Point = ORIGIN): Point {
  const radians = (degrees * Math.PI) / 180;
  const off = subtract(a, center);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return add({ x: off.x * cos - off.y * sin, y: off.x * sin + off.y * cos }, center);
}

/**
 * Whether turning from `a` to `b`, both taken as vectors, is a clockwise turn: the sign of the
 * cross product's Z coordinate. Collinear vectors are not a clockwise turn.
 */
export const turnsClockwise = (a: Point, b: Point): boolean => a.x * b.y - a.y * b.x > 0;

/** The unit vector pointing from (0, 0) towards `a`. */
export function unit(a: Point): Point {
  const d = distance(a);
  if (!(d > 0)) throw new RangeError("Can't compute the unit vector of a zero-length vector");
  return divide(a, d);
}

/** The angle of `a` from the positive x axis, in radians. */
export const direction = (a: Point): number => Math.atan2(a.y, a.x);

export const radialToCartesian = (
  radius: number,
  angleRadians: number,
  center: Point = ORIGIN,
): Point => ({
  x: Math.cos(angleRadians) * radius + center.x,
  y: Math.sin(angleRadians) * radius + center.y,
});

export const square = (x: number): number => x * x;

export const lerp = (start: number, stop: number, fraction: number): number =>
  start * (1 - fraction) + stop * fraction;

export const interpolate = (start: Point, stop: Point, fraction: number): Point => ({
  x: lerp(start.x, stop.x, fraction),
  y: lerp(start.y, stop.y, fraction),
});

/**
 * `num % mod` as Dart computes it: never negative (-4 mod 3 is 2, not JavaScript's -1). The
 * original relies on this, so the rounding of `positiveModulo` below is the same as there.
 */
const euclideanModulo = (num: number, mod: number): number => {
  const remainder = num % mod;
  return remainder < 0 ? remainder + Math.abs(mod) : remainder;
};

/** Like `num % mod`, but the result is never negative: -4 mod 3 is 2, not -1. */
export const positiveModulo = (num: number, mod: number): number =>
  euclideanModulo(euclideanModulo(num, mod) + mod, mod);

/** Approximates whether the corner at `current` is convex, from the previous and next points. */
export const isConvex = (previous: Point, current: Point, next: Point): boolean =>
  turnsClockwise(subtract(current, previous), subtract(next, current));

/** The smallest rectangle holding both. */
export const unionBounds = (a: Bounds, b: Bounds): Bounds => ({
  left: Math.min(a.left, b.left),
  top: Math.min(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
});

/**
 * The position of `value` in `sortedList` (sorted by `keyOf`), or `-insertionIndex - 1` where
 * it would be inserted to keep the order.
 */
export function binarySearchBy<E>(
  sortedList: readonly E[],
  keyOf: (element: E) => number,
  value: number,
): number {
  let min = 0;
  let max = sortedList.length;
  while (min < max) {
    const mid = min + ((max - min) >> 1);
    const key = keyOf(sortedList[mid] as E);
    if (key === value) return mid;
    if (key < value) min = mid + 1;
    else max = mid;
  }
  return -min - 1;
}
