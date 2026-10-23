import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadDatabase } from '../src/database.ts';
import { elevationShadow, emitSystemCss } from '../src/emit-system.ts';

const db = loadDatabase();
const css = emitSystemCss(db, { layer: 'wisp' });

describe('emitSystemCss', () => {
  it('declares everything inside the library cascade layer', () => {
    expect(css).toMatch(/@layer wisp \{\n {2}:root \{/);
  });

  it('maps the baseline colours through light-dark()', () => {
    expect(css).toContain('--md-sys-color-primary: light-dark(#6750a4, #d0bcff);');
    expect(css).toContain('--md-sys-color-on-primary: light-dark(#ffffff, #381e72);');
  });

  it('ships Expressive springs by default and Standard behind an attribute', () => {
    const [rootBlock, standardBlock] = css.split("[data-wisp-motion='standard']") as [
      string,
      string,
    ];
    expect(rootBlock).toMatch(/--md-sys-motion-spring-fast-spatial: \d+ms linear\(/);
    expect(standardBlock).toMatch(/--md-sys-motion-spring-fast-spatial: \d+ms linear\(/);
    const fast = (text: string) => /--md-sys-motion-spring-fast-spatial: (\d+)ms/.exec(text)?.[1];
    // Expressive is deliberately slower and bouncier than Standard.
    expect(Number(fast(rootBlock))).toBeGreaterThan(Number(fast(standardBlock)));
  });

  it('emits contrast overlays that only restate changed roles', () => {
    const medium = /\[data-wisp-contrast='medium'\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(medium).toContain('--md-sys-color-primary:');
    expect(medium).not.toContain('--md-sys-color-scrim:');
  });

  it('maps prefers-contrast: more onto the high scheme, unless the app chose a level', () => {
    const media =
      /@media \(prefers-contrast: more\) \{\s*:root:not\(\[data-wisp-contrast\]\) \{([^}]*)\}/.exec(
        css,
      )?.[1];
    const high = /\[data-wisp-contrast='high'\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(media).toBeDefined();
    // The same roles with the same values as the high block, restated.
    const roles = (text: string) =>
      text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    expect(roles(media ?? '')).toEqual(roles(high));
    expect(media).toContain('--md-sys-color-primary:');
    // It comes after the root's colours, so the same-origin cascade lets it win.
    expect(css.indexOf('@media (prefers-contrast: more)')).toBeGreaterThan(css.indexOf(':root {'));
  });

  it('uses rem for type so it follows user font-size preferences', () => {
    expect(css).toContain(
      '--md-sys-typescale-label-large: 500 0.875rem/1.25rem var(--md-ref-typeface-plain);',
    );
    expect(css).toContain(
      '--md-sys-typescale-display-large: 400 3.5625rem/4rem var(--md-ref-typeface-brand);',
    );
  });

  it('defines no custom property twice within a block', () => {
    // A block starts at a selector or an at-rule, two spaces in.
    for (const block of css.split(/\n {2}(?=[:[@])/)) {
      const names = [...block.matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]);
      expect(new Set(names).size, block.slice(0, 60)).toBe(names.length);
    }
  });

  it('has balanced braces', () => {
    expect(css.split('{').length).toBe(css.split('}').length);
  });

  it('is in sync with the committed packages/tokens/src/theme.generated.css', () => {
    const committed = readFileSync(
      new URL('../../../packages/tokens/src/theme.generated.css', import.meta.url),
      'utf8',
    );
    expect(committed, 'run `pnpm codegen generate`').toBe(css);
  });
});

describe('elevationShadow', () => {
  const stripColor = (value: string) =>
    value.replaceAll(
      /color-mix\(in srgb, var\(--md-sys-color-shadow\) (\d+)%, transparent\)/g,
      '$1%',
    );

  it('matches the published Material level 1–3 shadows', () => {
    expect(stripColor(elevationShadow(1))).toBe('0 1px 2px 0 30%, 0 1px 3px 1px 15%');
    expect(stripColor(elevationShadow(2))).toBe('0 1px 2px 0 30%, 0 2px 6px 2px 15%');
    expect(stripColor(elevationShadow(3))).toBe('0 1px 3px 0 30%, 0 4px 8px 3px 15%');
  });

  it('keeps two shadows at every level so levels interpolate smoothly', () => {
    for (const level of [0, 1, 2, 3, 4, 5]) {
      expect(stripColor(elevationShadow(level)).split('%, ')).toHaveLength(2);
    }
  });
});
