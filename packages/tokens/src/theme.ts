/**
 * Dynamic colour: derive the full set of `--md-sys-color-*` roles from a seed
 * colour at runtime: a whole theme from one colour.
 *
 * The static `theme.css` carries the fixed *baseline* palette. A seed
 * run through the modern algorithm is intentionally not identical to it: the
 * baseline predates the current palette generator.
 */

import {
  argbFromHex,
  type DynamicColor,
  type DynamicScheme,
  Hct,
  hexFromArgb,
  MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
} from '@material/material-color-utilities';
import { COLOR_ROLES } from './color-roles.generated.js';

/** Palette strategies: how a seed colour is spread across the palette. */
export type ThemeVariant =
  | 'tonal-spot'
  | 'vibrant'
  | 'expressive'
  | 'neutral'
  | 'monochrome'
  | 'fidelity'
  | 'content'
  | 'rainbow'
  | 'fruit-salad';

/**
 * The one shape of the scheme classes we rely on. Typing the table with this,
 * rather than inferring it, keeps the (bundler-only) library's types out of
 * our published declarations.
 */
type SchemeConstructor = new (
  source: Hct,
  isDark: boolean,
  contrast: number,
  specVersion: '2021' | '2025',
) => DynamicScheme;

const VARIANTS: Record<ThemeVariant, SchemeConstructor> = {
  'tonal-spot': SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  rainbow: SchemeRainbow,
  'fruit-salad': SchemeFruitSalad,
};

export interface ThemeOptions {
  /** Palette strategy. Defaults to `tonal-spot`, the usual choice. */
  variant?: ThemeVariant;
  /**
   * -1 (reduced) to 1 (high). 0 is standard and 0.5 is "medium".
   * Baked into the generated colours, unlike the `data-wisp-contrast` switch,
   * which only works on the static baseline theme.
   */
  contrast?: number;
  /** Colour spec revision. Defaults to the current `2025` spec. */
  specVersion?: '2021' | '2025';
}

/** Anything with an inline style, so scoped themes work on elements and in tests. */
export interface ThemeTarget {
  style: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'>;
}

const HEX_SEED = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `on-primary-container` → `onPrimaryContainer`. */
const toCamelCase = (role: string) =>
  role.replace(/-(\w)/g, (_, char: string) => char.toUpperCase());

/**
 * Colour roles as CSS custom properties, e.g.
 * `{ '--md-sys-color-primary': 'light-dark(#65558f, #cfbdfe)' }`.
 */
export function createThemeProperties(
  seed: string,
  { variant = 'tonal-spot', contrast = 0, specVersion = '2025' }: ThemeOptions = {},
): Record<string, string> {
  if (!HEX_SEED.test(seed))
    throw new Error(`Seed must be a hex colour like #6750a4, got "${seed}"`);
  if (!(contrast >= -1 && contrast <= 1))
    throw new RangeError(`contrast must be in [-1, 1], got ${contrast}`);

  const source = Hct.fromInt(argbFromHex(seed));
  const Scheme = VARIANTS[variant];
  const light = new Scheme(source, false, contrast, specVersion);
  const dark = new Scheme(source, true, contrast, specVersion);
  const colors = MaterialDynamicColors as unknown as Record<string, DynamicColor | undefined>;

  const properties: Record<string, string> = {};
  for (const role of COLOR_ROLES) {
    const color = colors[toCamelCase(role)];
    if (!color)
      throw new Error(`Colour role "${role}" is not provided by material-color-utilities`);
    const a = hexFromArgb(color.getArgb(light));
    const b = hexFromArgb(color.getArgb(dark));
    properties[`--md-sys-color-${role}`] = a === b ? a : `light-dark(${a}, ${b})`;
  }
  return properties;
}

/**
 * A rule setting the roles on `selector`. Unlayered on purpose, so it beats the
 * library's `@layer wisp` baseline without specificity games.
 */
export function createThemeCss(seed: string, options?: ThemeOptions, selector = ':root'): string {
  const declarations = Object.entries(createThemeProperties(seed, options))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `${selector} {\n${declarations}\n}\n`;
}

/**
 * Applies the theme inline to one element, which scopes it to that subtree.
 * Returns a function that removes it again.
 */
export function applyTheme(target: ThemeTarget, seed: string, options?: ThemeOptions): () => void {
  const properties = createThemeProperties(seed, options);
  for (const [name, value] of Object.entries(properties)) target.style.setProperty(name, value);
  return () => {
    for (const name of Object.keys(properties)) target.style.removeProperty(name);
  };
}
