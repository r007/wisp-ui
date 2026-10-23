/**
 * The motion of a morph: a damped spring from one shape to another.
 *
 * A morph takes a progress from 0 (the start shape) to 1 (the end shape); a spring takes it a little
 * past 1 and back, which is what gives a shape its bounce.
 */

/** A spring that moves a morph: bouncy enough to see, settled in well under a second. */
export const MORPH_SPRING = { dampingRatio: 0.6, stiffness: 200 } as const;

/**
 * Where a damped spring is `seconds` after it was let go, when it starts at 0 and comes to rest at
 * 1 (a unit mass, as in Material's spring tokens). With a damping ratio under 1 it overshoots.
 */
export function springPosition(
  seconds: number,
  { dampingRatio, stiffness }: { dampingRatio: number; stiffness: number } = MORPH_SPRING,
): number {
  if (seconds <= 0) return 0;
  const omega = Math.sqrt(stiffness);
  if (dampingRatio < 1) {
    const decay = dampingRatio * omega;
    const damped = omega * Math.sqrt(1 - dampingRatio * dampingRatio);
    return (
      1 -
      Math.exp(-decay * seconds) *
        (Math.cos(damped * seconds) + (decay / damped) * Math.sin(damped * seconds))
    );
  }
  if (dampingRatio === 1) {
    return 1 - Math.exp(-omega * seconds) * (1 + omega * seconds);
  }
  // Overdamped: two real roots, no overshoot.
  const root = omega * Math.sqrt(dampingRatio * dampingRatio - 1);
  const decay = dampingRatio * omega;
  const r1 = -decay + root;
  const r2 = -decay - root;
  return 1 - (r2 * Math.exp(r1 * seconds) - r1 * Math.exp(r2 * seconds)) / (r2 - r1);
}

const settleTimes = new Map<string, number>();

/** How long a spring takes to come to rest: until it stays within a thousandth of where it ends. */
export function springSettleSeconds(
  spring: { dampingRatio: number; stiffness: number } = MORPH_SPRING,
): number {
  const key = `${spring.dampingRatio}/${spring.stiffness}`;
  let seconds = settleTimes.get(key);
  if (seconds === undefined) {
    // Look for the last moment it is outside the band, in steps well under a frame.
    const step = 0.005;
    let last = 0;
    for (let t = 0; t < 10; t += step) {
      if (Math.abs(springPosition(t, spring) - 1) > 0.001) last = t;
    }
    seconds = last + step;
    settleTimes.set(key, seconds);
  }
  return seconds;
}
