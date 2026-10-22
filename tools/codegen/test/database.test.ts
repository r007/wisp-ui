import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { baseVariant } from '../src/import-flutter.ts';
import type { TokenDatabase } from '../src/types.ts';

/**
 * Invariants of the committed `data/tokens.json`. They protect the emitters
 * from a bad upstream import, and are cheap because they need no Flutter
 * checkout.
 */
const db: TokenDatabase = JSON.parse(
  readFileSync(new URL('../data/tokens.json', import.meta.url), 'utf8'),
);

describe('committed token database', () => {
  it('records provenance', () => {
    expect(db.meta.repository).toBe('https://github.com/flutter/packages');
    expect(db.meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(db.meta.tokenVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('contains the Expressive Button model', () => {
    expect(db.tokens['md.comp.button.filled.container.color']).toEqual({
      type: 'color',
      role: 'primary',
    });
    expect(db.tokens['md.comp.button.xsmall.container.height']).toEqual({
      type: 'number',
      value: 32,
    });
    expect(
      db.tokens['md.comp.button.pressed.container.corner-size.motion.spring.stiffness'],
    ).toEqual({ type: 'ref', name: 'md.sys.motion.spring.fast.spatial.stiffness' });
  });

  it('keeps Standard and Expressive springs distinct under the same names', () => {
    const damping = 'md.sys.motion.spring.fast.spatial.damping';
    expect(db.schemes.motion.standard?.[damping]).toEqual({ type: 'number', value: 0.9 });
    expect(db.schemes.motion.expressive?.[damping]).toEqual({ type: 'number', value: 0.6 });
  });

  it('defines every colour role in both full colour schemes', () => {
    const light = Object.keys(db.schemes.color.light ?? {});
    const dark = Object.keys(db.schemes.color.dark ?? {});
    expect(light.length).toBeGreaterThan(40);
    expect(new Set(dark)).toEqual(new Set(light));
  });

  it('only lets contrast variants override roles that their base defines', () => {
    for (const [id, record] of Object.entries(db.schemes.color)) {
      const base = db.schemes.color[baseVariant(id)] ?? {};
      for (const name of Object.keys(record)) expect(base, `${id}: ${name}`).toHaveProperty([name]);
    }
  });

  it('has no dangling references and no unresolved dart symbols', () => {
    const schemeNames = new Set(Object.keys(db.schemes.motion.standard ?? {}));
    for (const [name, value] of Object.entries(db.tokens)) {
      if (value.type === 'ref') {
        expect(
          value.name in db.tokens || schemeNames.has(value.name),
          `${name} → ${value.name}`,
        ).toBe(true);
      }
      expect(value.type as string, name).not.toBe('dart-ref');
    }
  });

  it('is serialised with one token per line for reviewable diffs', () => {
    const text = readFileSync(new URL('../data/tokens.json', import.meta.url), 'utf8');
    expect(text.split('\n').length).toBeGreaterThan(Object.keys(db.tokens).length);
    expect(text.endsWith('\n')).toBe(true);
  });
});
