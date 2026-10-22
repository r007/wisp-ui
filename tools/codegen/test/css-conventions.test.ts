import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Architectural rules for every component stylesheet. They are cheap to check
 * here and expensive to discover in a consumer's bundle, so they fail the build.
 */
const SRC = new URL('../../../packages/react/src/', import.meta.url).pathname;

function stylesheets(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.module.css'))
    .map((e) => join(e.parentPath, e.name));
}

const files = stylesheets(SRC).map((path) => ({
  name: relative(SRC, path),
  css: readFileSync(path, 'utf8'),
  generated: path.endsWith('.generated.module.css'),
}));

/** Removes comments so prose cannot satisfy or violate a rule. */
const code = (css: string) => css.replaceAll(/\/\*[\s\S]*?\*\//g, '');

describe('component stylesheets', () => {
  it('finds the stylesheets', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  describe.each(files)('$name', ({ css, generated }) => {
    it('is entirely inside the library cascade layer, so consumers always win', () => {
      const stripped = code(css).trim();
      expect(stripped.startsWith('@layer wisp {')).toBe(true);
      expect(stripped.endsWith('}')).toBe(true);
      // One top-level block: no rules leak out of the layer.
      let depth = 0;
      let closedAt = -1;
      for (const [i, char] of [...stripped].entries()) {
        if (char === '{') depth++;
        if (char === '}' && --depth === 0) closedAt = i;
      }
      expect(closedAt).toBe(stripped.length - 1);
    });

    it('never uses !important', () => {
      expect(code(css)).not.toMatch(/!important/);
    });

    it.skipIf(generated)('takes every timing from a motion token, not a literal', () => {
      const body = code(css);
      // `transition: opacity 375ms linear` would not follow the Standard/Expressive switch.
      const literal = [...body.matchAll(/transition[^;]*?\b\d+(?:\.\d+)?m?s\b/g)].map((m) => m[0]);
      // The press ripple's own durations are Material constants ported from material-web.
      const allowed = (match: string) => match.includes('375ms') || match.includes('105ms');
      expect(literal.filter((m) => !allowed(m))).toEqual([]);
    });
  });
});
