import { describe, expect, it } from 'vitest';
import { settleTime, springPosition, springToLinearEasing } from '../src/spring.ts';

// Material 3 Expressive springs (md.sys.motion.spring.*).
const FAST_SPATIAL = { stiffness: 800, damping: 0.6 };
const DEFAULT_SPATIAL = { stiffness: 380, damping: 0.8 };
const DEFAULT_EFFECTS = { stiffness: 1600, damping: 1 };

describe('springPosition', () => {
  it.each([FAST_SPATIAL, DEFAULT_SPATIAL, DEFAULT_EFFECTS, { stiffness: 500, damping: 1.4 }])(
    'starts at 0 and converges on 1 (%o)',
    (spring) => {
      expect(springPosition(0, spring)).toBe(0);
      expect(springPosition(3, spring)).toBeCloseTo(1, 4);
    },
  );

  it('overshoots when under-damped', () => {
    const peak = Math.max(...range(0, 1, 0.005).map((t) => springPosition(t, FAST_SPATIAL)));
    expect(peak).toBeGreaterThan(1.05);
  });

  it('never overshoots when critically damped or over-damped', () => {
    for (const spring of [DEFAULT_EFFECTS, { stiffness: 500, damping: 1.4 }]) {
      const peak = Math.max(...range(0, 2, 0.005).map((t) => springPosition(t, spring)));
      expect(peak).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('is continuous across the critical-damping boundary', () => {
    const below = springPosition(0.1, { stiffness: 900, damping: 0.9999 });
    const exact = springPosition(0.1, { stiffness: 900, damping: 1 });
    const above = springPosition(0.1, { stiffness: 900, damping: 1.0001 });
    expect(below).toBeCloseTo(exact, 3);
    expect(above).toBeCloseTo(exact, 3);
  });
});

describe('settleTime', () => {
  it('is shorter for stiffer springs', () => {
    expect(settleTime({ stiffness: 1600, damping: 1 })).toBeLessThan(
      settleTime({ stiffness: 200, damping: 1 }),
    );
  });

  it('rejects a spring that never settles', () => {
    expect(() => settleTime({ stiffness: 1, damping: 0.001 })).toThrow(/does not settle/);
  });
});

describe('springToLinearEasing', () => {
  it('produces a valid, compact linear() with overshoot for the bouncy fast spatial spring', () => {
    const { easing, durationMs } = springToLinearEasing(FAST_SPATIAL);
    expect(easing).toMatch(/^linear\(0, .+, 1\)$/);
    const values = [...easing.matchAll(/(-?\d*\.?\d+)(?: [\d.]+%)?[,)]/g)].map((m) => Number(m[1]));
    expect(Math.max(...values)).toBeGreaterThan(1.05);
    expect(values.length).toBeLessThan(40);
    expect(durationMs).toBeGreaterThan(200);
    expect(durationMs).toBeLessThan(900);
  });

  it('stays within tolerance of the exact curve when evaluated like a browser would', () => {
    for (const spring of [FAST_SPATIAL, DEFAULT_SPATIAL, DEFAULT_EFFECTS]) {
      const { easing, durationMs } = springToLinearEasing(spring);
      const stops = parseLinear(easing);
      for (const progress of range(0, 1, 0.01)) {
        const approx = evaluate(stops, progress);
        const exact = springPosition(progress * (durationMs / 1000), spring);
        expect(Math.abs(approx - exact), `${JSON.stringify(spring)} @ ${progress}`).toBeLessThan(
          0.01,
        );
      }
    }
  });

  it('exposes a transition-ready shorthand', () => {
    const { css, durationMs, easing } = springToLinearEasing(DEFAULT_EFFECTS);
    expect(css).toBe(`${durationMs}ms ${easing}`);
  });

  it('is deterministic', () => {
    expect(springToLinearEasing(FAST_SPATIAL)).toEqual(springToLinearEasing(FAST_SPATIAL));
  });

  it('rejects nonsensical input', () => {
    expect(() => springToLinearEasing({ stiffness: 0, damping: 1 })).toThrow(/Invalid spring/);
    expect(() => springToLinearEasing({ stiffness: 100, damping: -1 })).toThrow(/Invalid spring/);
  });
});

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(v);
  return out;
}

/** Minimal `linear()` parser: positions default to even spacing between explicit ones. */
function parseLinear(easing: string): Array<{ x: number; y: number }> {
  const body = easing.slice('linear('.length, -1);
  const raw = body.split(', ').map((part) => {
    const [value, position] = part.split(' ');
    return { y: Number(value), x: position ? Number.parseFloat(position) / 100 : null };
  });
  raw[0] = { y: (raw[0] as { y: number }).y, x: 0 };
  raw[raw.length - 1] = { y: (raw.at(-1) as { y: number }).y, x: 1 };
  return raw as Array<{ x: number; y: number }>;
}

function evaluate(stops: Array<{ x: number; y: number }>, at: number): number {
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1] as { x: number; y: number };
    const b = stops[i] as { x: number; y: number };
    if (at <= b.x) return a.y + ((b.y - a.y) * (at - a.x)) / (b.x - a.x || 1);
  }
  return (stops.at(-1) as { y: number }).y;
}
