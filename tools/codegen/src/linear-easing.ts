/**
 * Helpers for expressing an arbitrary curve as a CSS `linear()` easing.
 */

export interface Point {
  /** Normalised time, 0–1. */
  x: number;
  /** Progress; may leave 0–1 to describe overshoot. */
  y: number;
}

/** Ramer–Douglas–Peucker, measuring the vertical error so overshoot peaks survive. */
export function simplify(points: Point[], tolerance: number): Point[] {
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    const a = points[start] as Point;
    const b = points[end] as Point;
    let worst = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const p = points[i] as Point;
      const expected = a.y + ((b.y - a.y) * (p.x - a.x)) / (b.x - a.x);
      const error = Math.abs(p.y - expected);
      if (error > worst) {
        worst = error;
        index = i;
      }
    }
    if (index !== -1 && worst > tolerance) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

/** `linear(0, 0.25 25%, …, 1)`; the first and last stops are implicitly at 0% and 100%. */
export function formatLinear(points: Point[]): string {
  const stops = points.map((point, index) => {
    const value = trim(point.y, 4);
    if (index === 0 || index === points.length - 1) return value;
    return `${value} ${trim(point.x * 100, 1)}%`;
  });
  return `linear(${stops.join(', ')})`;
}

/**
 * Material publishes Expressive's `emphasized` easing as an SVG path of chained
 * cubic-béziers (`M 0,0 C … C …`), which no single `cubic-bezier()` can
 * express. Sample it into a `linear()` instead.
 */
export function pathToLinearEasing(path: string, tolerance = 0.002): string {
  const tokens = path.match(/[MC]|-?\d*\.?\d+/g) ?? [];
  let cursor = 0;
  const number = (): number => {
    const value = Number(tokens[cursor++]);
    if (Number.isNaN(value)) throw new Error(`Malformed easing path: ${path}`);
    return value;
  };

  if (tokens[cursor++] !== 'M') throw new Error(`Easing path must start with M: ${path}`);
  let start: Point = { x: number(), y: number() };
  const points: Point[] = [start];

  while (cursor < tokens.length) {
    if (tokens[cursor++] !== 'C') throw new Error(`Only cubic segments are supported: ${path}`);
    const c1 = { x: number(), y: number() };
    const c2 = { x: number(), y: number() };
    const end = { x: number(), y: number() };
    for (let step = 1; step <= 64; step++) {
      const t = step / 64;
      const u = 1 - t;
      const mix = (a: number, b: number, c: number, d: number) =>
        u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
      points.push({
        x: mix(start.x, c1.x, c2.x, end.x),
        y: mix(start.y, c1.y, c2.y, end.y),
      });
    }
    start = end;
  }

  const last = points.at(-1) as Point;
  if (points.length < 2 || last.x !== 1 || last.y !== 1 || points[0]?.x !== 0) {
    throw new Error(`Easing path must run from (0,0) to (1,1): ${path}`);
  }
  return formatLinear(simplify(points, tolerance));
}

function trim(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}
