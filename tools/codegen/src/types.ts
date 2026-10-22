/**
 * Normalised, language-neutral model of Material design tokens.
 *
 * Token names are the canonical dotted spec names, e.g.
 * `md.comp.button.filled.container.color`. Values are typed so emitters never
 * have to guess units or meaning from a bare number.
 */

export type ShapeFamily = 'rounded' | 'circular';

export type TokenValue =
  /** Unitless double as published upstream. Unit semantics come from the name, see `units.ts`. */
  | { type: 'number'; value: number }
  /** Free-form string (e.g. a font family name). */
  | { type: 'string'; value: string }
  /** Reference to a system colour role such as `on-primary` (`md.sys.color.on-primary`). */
  | { type: 'color'; role: string }
  /** Literal sRGB colour, `#rrggbb` or `#rrggbbaa`. */
  | { type: 'hex'; value: string }
  /** Corner shape. `corners` order is top-left, top-right, bottom-right, bottom-left (CSS order). */
  | { type: 'shape'; family: ShapeFamily; corners: readonly [number, number, number, number] }
  | {
      type: 'typescale';
      font: string;
      size: number;
      weight: number;
      lineHeight: number;
      tracking: number;
    }
  | { type: 'duration'; ms: number }
  | { type: 'cubic-bezier'; points: readonly [number, number, number, number] }
  /** Alias to another token by canonical name. */
  | { type: 'ref'; name: string };

export interface TokenSourceMeta {
  /** Repository the data was imported from. */
  repository: string;
  /** Path of the data directory inside the repository. */
  path: string;
  /** Git commit the data was imported at. */
  commit: string;
  /** Material token release, e.g. `38.2.83`. */
  tokenVersion: string;
}

/**
 * Some token families come in interchangeable *schemes* that reuse the same
 * token names with different values (light vs dark colour, standard vs
 * expressive springs). They live in `schemes` instead of the flat `tokens` map.
 */
export type SchemeAxis = 'color' | 'motion';

export type SchemeSet = Record<string, Record<string, TokenValue>>;

export interface TokenDatabase {
  meta: TokenSourceMeta;
  /** Scheme-independent tokens, keyed by canonical name. */
  tokens: Record<string, TokenValue>;
  /**
   * `color`: `light`, `dark`, `light-medium-contrast`, … (`md.sys.color.*`).
   * `motion`: `standard`, `expressive` (`md.sys.motion.spring.*`).
   */
  schemes: Record<SchemeAxis, SchemeSet>;
}
