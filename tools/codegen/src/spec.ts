/**
 * Types for component token specs (`*.tokens.ts`). Kept free of imports so
 * component packages can depend on them without pulling in codegen internals.
 */

/** One token, or several that must all resolve to the same value. */
export type VarSource = string | readonly string[];

export interface TokenBlock {
  /**
   * Selector the variables are declared on. Class names in it become exports
   * of the CSS Module, e.g. `.filled` or `.filled.selected`.
   */
  selector: string;
  /** Token name prefix; paths in `vars` are relative to it. */
  prefix: string;
  /**
   * Private variable name (without `--_`) → token path(s) relative to `prefix`.
   * An array asserts that every listed token resolves to the same value.
   */
  vars: Readonly<Record<string, VarSource>>;
  /**
   * What the "circular" shape family means for this block. Defaults to a very
   * large radius; set e.g. `calc(var(--_container-height) / 2)` when the
   * radius is animated and must have a real value to interpolate from.
   */
  circularRadius?: string;
}

export interface ComponentTokenSpec {
  /** Used in the generated file's header. */
  name: string;
  blocks: readonly TokenBlock[];
}
