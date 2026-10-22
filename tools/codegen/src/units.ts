/**
 * Upstream publishes bare `double`s. Their meaning comes from the token name,
 * so classify it explicitly. Anything not listed as unitless is a length in
 * density-independent pixels (dp ≈ CSS px).
 */

export type NumberKind =
  /** A length: emitted as `px`. */
  | 'length'
  /** A pure number: opacity, spring stiffness, damping, multipliers. */
  | 'ratio'
  /** A Material elevation in dp, mapped onto `--md-sys-elevation-level*`. */
  | 'elevation';

const RATIO_SEGMENTS = new Set([
  'opacity',
  'state-layer-opacity',
  'stiffness',
  'damping',
  // sic: upstream spells it both ways
  'dampening',
  'multiplier',
]);

export function numberKind(token: string): NumberKind {
  const segment = token.slice(token.lastIndexOf('.') + 1);
  if (segment === 'elevation') return 'elevation';
  return RATIO_SEGMENTS.has(segment) ? 'ratio' : 'length';
}
