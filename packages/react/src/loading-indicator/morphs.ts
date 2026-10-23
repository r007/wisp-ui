/**
 * The shapes a loading indicator morphs through, and the morphs between them.
 *
 * The seven shapes come from the shape catalogue and are matched to each other by the same
 * morphing algorithm as any other pair (see `../shapes`), so each corner of one becomes a corner
 * of the next, and none can tangle.
 */

import { type ShapeName, shapes } from '../shapes/catalog.js';
import { Morph } from '../shapes/morph.js';

/** In the order the indicator morphs through them, and back to the first. */
export const SEQUENCE = [
  'softBurst',
  'cookie9Sided',
  'pentagon',
  'pill',
  'sunny',
  'cookie4Sided',
  'oval',
] as const satisfies readonly ShapeName[];

let scale: number | undefined;
let morphs: readonly Morph[] | undefined;

/**
 * How much to shrink the shapes so that the biggest, turned any way, still fits in the box the
 * tokens give the indicator: the box's side over the widest any shape reaches from its centre.
 * Cheap, so it is there for the first render.
 */
export function indicatorScale(): number {
  if (scale === undefined) {
    let widest = 1;
    for (const name of SEQUENCE) {
      const { left, right } = shapes[name].calculateMaxBounds();
      widest = Math.max(widest, right - left);
    }
    scale = 1 / widest;
  }
  return scale;
}

/**
 * `result[i]` goes from `SEQUENCE[i]` to the next shape, and the last back to the first. Built on
 * first use, once: matching two shapes is work worth doing only once.
 */
export function indicatorMorphs(): readonly Morph[] {
  if (!morphs) {
    const polygons = SEQUENCE.map((name) => shapes[name]);
    morphs = polygons.map(
      (polygon, i) => new Morph(polygon, polygons[(i + 1) % polygons.length] ?? polygon),
    );
  }
  return morphs;
}
