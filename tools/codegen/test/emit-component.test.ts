import { describe, expect, it } from 'vitest';
import { type ComponentTokenSpec, emitComponentCss } from '../src/emit-component.ts';
import type { TokenDatabase, TokenValue } from '../src/types.ts';

const number = (value: number): TokenValue => ({ type: 'number', value });
const color = (role: string): TokenValue => ({ type: 'color', role });

const db: TokenDatabase = {
  meta: {
    repository: 'https://example.test/repo',
    path: 'p',
    commit: 'a'.repeat(40),
    tokenVersion: '1.0.0',
  },
  schemes: { color: {}, motion: {} },
  tokens: {
    'md.sys.elevation.level0': number(0),
    'md.sys.elevation.level1': number(1),
    'md.sys.elevation.level2': number(3),
    'md.sys.typescale.label-large': {
      type: 'typescale',
      font: 'Roboto',
      size: 14,
      weight: 500,
      lineHeight: 20,
      tracking: 0.1,
    },
    'md.comp.t.container.color': color('primary'),
    'md.comp.t.container.elevation': number(3),
    'md.comp.t.container.height': number(40),
    'md.comp.t.disabled.label-text.opacity': number(0.38),
    'md.comp.t.hovered.label.color': color('on-primary'),
    'md.comp.t.focused.label.color': color('on-primary'),
    'md.comp.t.pressed.label.color': color('on-primary'),
    'md.comp.t.pressed.label.alt': color('secondary'),
    'md.comp.t.shape.round': { type: 'shape', family: 'circular', corners: [0, 0, 0, 0] },
    'md.comp.t.shape.square': { type: 'shape', family: 'rounded', corners: [12, 12, 12, 12] },
    'md.comp.t.shape.top': { type: 'shape', family: 'rounded', corners: [16, 16, 0, 0] },
    'md.comp.t.label-text': { type: 'ref', name: 'md.sys.typescale.label-large' },
    'md.comp.t.pressed.corner.motion.spring.stiffness': {
      type: 'ref',
      name: 'md.sys.motion.spring.fast.spatial.stiffness',
    },
    'md.comp.t.pressed.corner.motion.spring.damping': {
      type: 'ref',
      name: 'md.sys.motion.spring.fast.spatial.damping',
    },
    'md.comp.t.alias': { type: 'ref', name: 'md.comp.t.container.height' },
  },
};

const emit = (spec: ComponentTokenSpec) =>
  emitComponentCss(db, spec, { layer: 'wisp', source: 't.tokens.ts' });

describe('emitComponentCss', () => {
  it('wraps blocks in the layer and credits the source', () => {
    const css = emit({ name: 'T', blocks: [{ selector: '.a', prefix: 'md.comp.t', vars: {} }] });
    expect(css).toContain('@layer wisp {');
    expect(css).toContain('Generated from t.tokens.ts and Material tokens v1.0.0');
  });

  it('exposes each token as a public override that falls back to the system default', () => {
    const css = emit({
      name: 'T',
      blocks: [
        { selector: '.a', prefix: 'md.comp.t', vars: { 'container-color': 'container.color' } },
      ],
    });
    expect(css).toContain(
      '--_container-color: var(--md-comp-t-container-color, var(--md-sys-color-primary));',
    );
  });

  it('formats lengths, ratios and elevations by token meaning', () => {
    const css = emit({
      name: 'T',
      blocks: [
        {
          selector: '.a',
          prefix: 'md.comp.t',
          vars: {
            height: 'container.height',
            elevation: 'container.elevation',
            'disabled-opacity': 'disabled.label-text.opacity',
          },
        },
      ],
    });
    expect(css).toContain('--_height: var(--md-comp-t-container-height, 40px);');
    expect(css).toContain(
      '--_elevation: var(--md-comp-t-container-elevation, var(--md-sys-elevation-level2));',
    );
    expect(css).toContain(
      '--_disabled-opacity: var(--md-comp-t-disabled-label-text-opacity, 0.38);',
    );
  });

  it('collapses a stiffness/damping pair into the system spring variable', () => {
    const css = emit({
      name: 'T',
      blocks: [
        {
          selector: '.a',
          prefix: 'md.comp.t',
          vars: {
            spring: [
              'pressed.corner.motion.spring.stiffness',
              'pressed.corner.motion.spring.damping',
            ],
          },
        },
      ],
    });
    expect(css).toContain(
      '--_spring: var(--md-comp-t-pressed-corner-motion-spring, var(--md-sys-motion-spring-fast-spatial));',
    );
  });

  it('keeps typescales symbolic and emits tracking alongside', () => {
    const css = emit({
      name: 'T',
      blocks: [{ selector: '.a', prefix: 'md.comp.t', vars: { label: 'label-text' } }],
    });
    expect(css).toContain(
      '--_label: var(--md-comp-t-label-text, var(--md-sys-typescale-label-large));',
    );
    expect(css).toContain(
      '--_label-tracking: var(--md-comp-t-label-text-tracking, var(--md-sys-typescale-label-large-tracking));',
    );
  });

  it('turns shapes into radii, honouring a block-specific circular radius', () => {
    const css = emit({
      name: 'T',
      blocks: [
        {
          selector: '.a',
          prefix: 'md.comp.t',
          circularRadius: 'calc(var(--_height) / 2)',
          vars: { round: 'shape.round', square: 'shape.square', top: 'shape.top' },
        },
      ],
    });
    expect(css).toContain('--_round: var(--md-comp-t-shape-round, calc(var(--_height) / 2));');
    expect(css).toContain('--_square: var(--md-comp-t-shape-square, 12px);');
    expect(css).toContain('--_top: var(--md-comp-t-shape-top, 16px 16px 0px 0px);');
  });

  it('follows plain aliases to a concrete value', () => {
    const css = emit({
      name: 'T',
      blocks: [{ selector: '.a', prefix: 'md.comp.t', vars: { alias: 'alias' } }],
    });
    expect(css).toContain('--_alias: var(--md-comp-t-alias, 40px);');
  });

  describe('invariants', () => {
    it('accepts a group of tokens that resolve to the same value', () => {
      const css = emit({
        name: 'T',
        blocks: [
          {
            selector: '.a',
            prefix: 'md.comp.t',
            vars: {
              'label-color': ['hovered.label.color', 'focused.label.color', 'pressed.label.color'],
            },
          },
        ],
      });
      // The public override is named after the first token in the group.
      expect(css).toContain(
        '--_label-color: var(--md-comp-t-hovered-label-color, var(--md-sys-color-on-primary));',
      );
    });

    it('fails when a group stops being equal, naming both tokens', () => {
      expect(() =>
        emit({
          name: 'T',
          blocks: [
            {
              selector: '.a',
              prefix: 'md.comp.t',
              vars: { 'label-color': ['hovered.label.color', 'pressed.label.alt'] },
            },
          ],
        }),
      ).toThrow(
        /md\.comp\.t\.hovered\.label\.color and md\.comp\.t\.pressed\.label\.alt to be equal/,
      );
    });

    it('fails on an unknown token and suggests neighbours', () => {
      expect(() =>
        emit({
          name: 'T',
          blocks: [{ selector: '.a', prefix: 'md.comp.t', vars: { x: 'container.colour' } }],
        }),
      ).toThrow(/unknown token md\.comp\.t\.container\.colour[\s\S]*md\.comp\.t\.container\.color/);
    });

    it('fails on an elevation that is not a Material level', () => {
      const bad: TokenDatabase = {
        ...db,
        tokens: { ...db.tokens, 'md.comp.t.container.elevation': number(5) },
      };
      expect(() =>
        emitComponentCss(
          bad,
          {
            name: 'T',
            blocks: [{ selector: '.a', prefix: 'md.comp.t', vars: { e: 'container.elevation' } }],
          },
          { layer: 'wisp', source: 't.tokens.ts' },
        ),
      ).toThrow(/5dp is not a Material elevation/);
    });
  });
});
