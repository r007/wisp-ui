/**
 * Converts a physical spring into a CSS `linear()` easing.
 *
 * Material 3 Expressive describes motion as springs (stiffness + damping
 * ratio) instead of cubic-béziers. CSS has no spring timing function, but
 * `linear()` can describe an arbitrary curve, including overshoot, so we
 * sample the closed-form solution of a damped harmonic oscillator at build
 * time and ship the result as a plain CSS string: zero runtime, no JS animation
 * library.
 */

import { formatLinear, type Point, simplify } from './linear-easing.ts';

export interface SpringSpec {
  /** Spring stiffness `k` for a unit mass. */
  stiffness: number;
  /** Damping *ratio* ζ: 1 is critically damped, below 1 overshoots. */
  damping: number;
}

export interface SpringEasing {
  /** Time for the spring to settle, in milliseconds. */
  durationMs: number;
  /** A `linear(...)` timing function that goes 0 → 1 (and may overshoot 1). */
  easing: string;
  /** Shorthand usable directly in `transition`: `<duration> <easing>`. */
  css: string;
}

/** Remaining distance below which the spring counts as settled, as a fraction of travel. */
const SETTLE_TOLERANCE = 0.0025;
/** Maximum deviation of the simplified curve from the exact one. */
const SIMPLIFY_TOLERANCE = 0.002;
const SAMPLE_STEP_S = 0.002;
const MAX_DURATION_S = 5;

/** Position of a unit-mass spring released from 0 towards 1, `t` seconds in. */
export function springPosition(t: number, { stiffness, damping: zeta }: SpringSpec): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness);

  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * w0 * t);
    return 1 - decay * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) {
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  const root = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + root;
  const r2 = -zeta * w0 - root;
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

/** Smallest time after which the spring never again strays beyond the tolerance. */
export function settleTime(spring: SpringSpec): number {
  let last = 0;
  for (let t = 0; t <= MAX_DURATION_S; t += SAMPLE_STEP_S) {
    if (Math.abs(1 - springPosition(t, spring)) > SETTLE_TOLERANCE) last = t;
  }
  if (last >= MAX_DURATION_S - SAMPLE_STEP_S) {
    throw new Error(`Spring ${JSON.stringify(spring)} does not settle within ${MAX_DURATION_S}s`);
  }
  return last + SAMPLE_STEP_S;
}

export function springToLinearEasing(spring: SpringSpec): SpringEasing {
  if (!(spring.stiffness > 0) || !(spring.damping > 0)) {
    throw new Error(`Invalid spring ${JSON.stringify(spring)}`);
  }
  const duration = settleTime(spring);
  const steps = Math.ceil(duration / SAMPLE_STEP_S);

  const samples: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    samples.push({ x: i / steps, y: springPosition((i / steps) * duration, spring) });
  }
  // `linear()` ends exactly on its final stop, so land on the target precisely.
  samples[samples.length - 1] = { x: 1, y: 1 };

  const durationMs = Math.round(duration * 1000);
  const easing = formatLinear(simplify(samples, SIMPLIFY_TOLERANCE));
  return { durationMs, easing, css: `${durationMs}ms ${easing}` };
}
