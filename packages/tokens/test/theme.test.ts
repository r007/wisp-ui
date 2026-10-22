import { describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  COLOR_ROLES,
  createThemeCss,
  createThemeProperties,
  type ThemeVariant,
} from '../src/index.js';

const SEED = '#6750a4';

describe('createThemeProperties', () => {
  it('covers every colour role of the system, as light-dark() pairs where they differ', () => {
    const properties = createThemeProperties(SEED);
    expect(Object.keys(properties)).toEqual(COLOR_ROLES.map((role) => `--md-sys-color-${role}`));
    expect(properties['--md-sys-color-surface']).toMatch(
      /^light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\)$/,
    );
  });

  it('produces different light and dark values for the primary role', () => {
    const [, light, dark] =
      /^light-dark\((#\w+), (#\w+)\)$/.exec(
        createThemeProperties(SEED)['--md-sys-color-primary'] ?? '',
      ) ?? [];
    expect(light).toBeDefined();
    expect(light).not.toBe(dark);
  });

  it('is deterministic and responds to the seed', () => {
    expect(createThemeProperties(SEED)).toEqual(createThemeProperties(SEED));
    expect(createThemeProperties('#006a60')['--md-sys-color-primary']).not.toBe(
      createThemeProperties(SEED)['--md-sys-color-primary'],
    );
  });

  it('bakes contrast into the colours', () => {
    expect(createThemeProperties(SEED, { contrast: 1 })['--md-sys-color-primary']).not.toBe(
      createThemeProperties(SEED, { contrast: 0 })['--md-sys-color-primary'],
    );
  });

  it.each<ThemeVariant>([
    'tonal-spot',
    'vibrant',
    'expressive',
    'neutral',
    'monochrome',
    'fidelity',
    'content',
    'rainbow',
    'fruit-salad',
  ])('supports the %s variant for every role', (variant) => {
    expect(Object.keys(createThemeProperties(SEED, { variant }))).toHaveLength(COLOR_ROLES.length);
  });

  it('rejects bad input', () => {
    expect(() => createThemeProperties('purple')).toThrow(/Seed must be a hex colour/);
    expect(() => createThemeProperties(SEED, { contrast: 2 })).toThrow(RangeError);
  });
});

describe('createThemeCss', () => {
  it('scopes the roles to a selector, unlayered', () => {
    const css = createThemeCss(SEED, {}, '.brand');
    expect(css.startsWith('.brand {\n  --md-sys-color-background:')).toBe(true);
    expect(css).not.toContain('@layer');
  });
});

describe('applyTheme', () => {
  it('sets every role inline and can remove them again', () => {
    const target = { style: { setProperty: vi.fn(), removeProperty: vi.fn() } };
    const remove = applyTheme(target, SEED);
    expect(target.style.setProperty).toHaveBeenCalledTimes(COLOR_ROLES.length);
    remove();
    expect(target.style.removeProperty).toHaveBeenCalledTimes(COLOR_ROLES.length);
    expect(target.style.removeProperty).toHaveBeenCalledWith('--md-sys-color-primary');
  });
});
