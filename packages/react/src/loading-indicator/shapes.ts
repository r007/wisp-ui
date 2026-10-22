/**
 * The shapes a loading indicator morphs through, and the arithmetic to morph them.
 *
 * Material's own shapes are rounded polygons whose features are matched to each other by a
 * morphing algorithm. These are an approximation of the same seven shapes (soft burst, 9-sided
 * cookie, pentagon, pill, sunny, 4-sided cookie, oval) as *radial functions*: the distance from
 * the centre to the edge, at {@link POINTS} equally spaced angles. Two shapes sampled the same
 * way can be morphed by blending their radii one by one, which needs no feature matching and can
 * never tangle, and a smooth closed curve through the points draws any of them or any blend.
 */

/** How many angles each shape is sampled at: enough for a smooth outline, few enough to be cheap. */
export const POINTS = 72;

/** The radius of a shape at each of `POINTS` angles, in units where the viewBox is -1 to 1. */
export type Shape = readonly number[];

/** Where the biggest radius of a shape lands, leaving room for a morph to overshoot. */
const FILL = 0.94;

/** `0.5 + 0.5 cos(k θ)`: 1 at each of k lobes, 0 between them. */
const lobes = (k: number, theta: number) => 0.5 + 0.5 * Math.cos(k * theta);

/** The radius of a regular `n`-gon with its flat sides toward the axes, at angle `theta`. */
const polygon = (n: number, theta: number) => {
  const sector = (2 * Math.PI) / n;
  const within = ((((theta + Math.PI / 2) % sector) + sector) % sector) - sector / 2;
  return Math.cos(Math.PI / n) / Math.cos(within);
};

/** The radius of a superellipse with half-width `a`, half-height `b` and exponent `n`. */
const superellipse = (a: number, b: number, n: number, theta: number) =>
  (Math.abs(Math.cos(theta) / a) ** n + Math.abs(Math.sin(theta) / b) ** n) ** (-1 / n);

/** The radius of an ellipse with half-axes `a` and `b`, turned by `turn`. */
const ellipse = (a: number, b: number, turn: number, theta: number) => {
  const t = theta - turn;
  return (a * b) / Math.hypot(b * Math.cos(t), a * Math.sin(t));
};

/** Samples a radius function, scaled so that its largest radius is {@link FILL}. */
const sample = (radius: (theta: number) => number): Shape => {
  const raw = Array.from({ length: POINTS }, (_, i) => radius((i / POINTS) * 2 * Math.PI));
  const biggest = Math.max(...raw);
  return raw.map((r) => (r / biggest) * FILL);
};

/** The seven shapes, in the order the indicator morphs through them. */
export const SHAPES: readonly Shape[] = [
  // Soft burst: ten rounded points.
  sample((t) => 0.74 + 0.26 * lobes(10, t) ** 1.4),
  // Cookie with nine scallops.
  sample((t) => 0.86 + 0.14 * lobes(9, t)),
  // Pentagon, its corners rounded by blending toward a circle.
  sample((t) => 0.55 * polygon(5, t) + 0.45 * 0.9),
  // Pill, lying down.
  sample((t) => superellipse(1, 0.56, 4, t)),
  // Sunny: eight rays.
  sample((t) => 0.82 + 0.18 * lobes(8, t) ** 0.7),
  // Cookie with four bumps.
  sample((t) => 0.8 + 0.2 * lobes(4, t) ** 0.8),
  // Oval, turned a little.
  sample((t) => ellipse(1, 0.74, Math.PI / 4, t)),
];

/** Mixes two shapes: `t` of 0 is `a`, 1 is `b`. `t` may overshoot a little, as a spring does. */
export function blend(a: Shape, b: Shape, t: number): number[] {
  return a.map((r, i) => r + ((b[i] as number) - r) * t);
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * An SVG path for a shape: a smooth closed curve through its points (a Catmull-Rom spline,
 * written as cubic Béziers), centred on the origin.
 */
export function pathOf(shape: Shape): string {
  const n = shape.length;
  const points = shape.map((r, i) => {
    const theta = (i / n) * 2 * Math.PI;
    return [r * Math.cos(theta), r * Math.sin(theta)] as const;
  });
  const at = (i: number) => points[((i % n) + n) % n] as readonly [number, number];
  let d = `M${round(at(0)[0])} ${round(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d += `C${round(x1 + (x2 - x0) / 6)} ${round(y1 + (y2 - y0) / 6)} ${round(x2 - (x3 - x1) / 6)} ${round(y2 - (y3 - y1) / 6)} ${round(x2)} ${round(y2)}`;
  }
  return `${d}Z`;
}

/**
 * A damped spring from 0 to 1 over `t` in 0..1, with the slight overshoot of Material's fast
 * spatial spring. It has all but settled by the end.
 */
export function spring(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const decay = 7;
  const frequency = 11;
  return (
    1 -
    Math.exp(-decay * t) * (Math.cos(frequency * t) + (decay / frequency) * Math.sin(frequency * t))
  );
}
