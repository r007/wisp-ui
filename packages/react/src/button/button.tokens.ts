/**
 * Which Material 3 Expressive tokens feed the Button's private variables.
 *
 * Run `pnpm codegen tokens md.comp.button.filled` to browse what exists.
 * Arrays assert that every listed token has the same value: the hand-written
 * CSS collapses them (e.g. one label colour for rest/hover/focus/press), so
 * generation fails loudly if an upstream update ever makes them diverge.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const STATES = ['hovered', 'focused', 'pressed'] as const;

/** `label-text.color` plus its hover/focus/press siblings, which must match. */
const sameInEveryState = (path: string, prefix = '') => [
  `${prefix}${path}`,
  ...STATES.map((state) => `${prefix}${state}.${path}`),
];

/** Hover/focus/press share one state-layer colour; opacity is per-state. */
const stateLayerColor = (prefix = '') =>
  STATES.map((state) => `${prefix}${state}.state-layer.color`);

const BASE = 'md.comp.button';

/** Every variant, with the tokens it has: only some have a container or an outline. */
const variants: Array<{
  name: string;
  /** Has a container colour and elevation. */
  container: boolean;
  /** Has a disabled container colour (outlined only fades an existing outline). */
  disabledContainer: boolean;
  outline: boolean;
  toggle: boolean;
}> = [
  { name: 'elevated', container: true, disabledContainer: true, outline: false, toggle: true },
  { name: 'filled', container: true, disabledContainer: true, outline: false, toggle: true },
  { name: 'tonal', container: true, disabledContainer: true, outline: false, toggle: true },
  { name: 'outlined', container: false, disabledContainer: false, outline: true, toggle: true },
  { name: 'text', container: false, disabledContainer: true, outline: false, toggle: false },
];

const variantBlocks = variants.flatMap(
  ({ name, container, disabledContainer, outline, toggle }): TokenBlock[] => {
    const prefix = `${BASE}.${name}`;
    const rest: TokenBlock = {
      selector: `.${name}`,
      prefix,
      vars: {
        ...(container && {
          'container-color': 'container.color',
          // Expressive no longer changes elevation on hover; hover has no token.
          'container-elevation': [
            'container.elevation',
            'focused.container.elevation',
            'pressed.container.elevation',
          ],
        }),
        'label-color': sameInEveryState('label-text.color'),
        'icon-color': sameInEveryState('icon.color'),
        'state-layer-color': stateLayerColor(),
        ...(disabledContainer && { 'disabled-container-color': 'disabled.container.color' }),
        'disabled-label-color': 'disabled.label-text.color',
        'disabled-icon-color': 'disabled.icon.color',
        ...(outline && {
          'outline-color': sameInEveryState('outline.color'),
          'disabled-outline-color': 'disabled.outline.color',
        }),
      },
    };
    if (!toggle) return [rest];

    const toggleBlock = (state: 'selected' | 'unselected'): TokenBlock => ({
      selector: `.${name}.${state}`,
      prefix: `${prefix}.${state}`,
      vars: {
        // Outlined unselected has no container: it stays transparent.
        ...((container || state === 'selected') && { 'container-color': 'container.color' }),
        'label-color': sameInEveryState('label-text.color'),
        'icon-color': sameInEveryState('icon.color'),
        'state-layer-color': stateLayerColor(),
      },
    });
    return [rest, toggleBlock('selected'), toggleBlock('unselected')];
  },
);

const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

const sizeBlocks = sizes.map(
  (size): TokenBlock => ({
    selector: `.size-${size}`,
    prefix: `${BASE}.${size}`,
    // Corners animate between shapes, so "circular" needs a real radius.
    circularRadius: 'calc(var(--_container-height) / 2)',
    vars: {
      'container-height': 'container.height',
      'leading-space': 'leading-space',
      'trailing-space': 'trailing-space',
      'icon-label-space': 'icon-label-space',
      'icon-size': 'icon.size',
      'label-font': 'label-text',
      'outline-width': 'outlined.outline.width',
      'shape-round': 'container.shape.round',
      'shape-square': 'container.shape.square',
      'selected-shape-round': 'selected.container.shape.round',
      'selected-shape-square': 'selected.container.shape.square',
      'pressed-shape': 'pressed.container.shape',
      'shape-spring': [
        'pressed.container.corner-size.motion.spring.stiffness',
        'pressed.container.corner-size.motion.spring.damping',
      ],
    },
  }),
);

export default {
  name: 'Button',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      vars: {
        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
        'hover-state-layer-opacity': 'hovered.state-layer.opacity',
        'focus-state-layer-opacity': 'focused.state-layer.opacity',
        'pressed-state-layer-opacity': 'pressed.state-layer.opacity',
        'disabled-container-opacity': 'disabled.container.opacity',
        'disabled-label-opacity': 'disabled.label-text.opacity',
        'disabled-icon-opacity': 'disabled.icon.opacity',
      },
    },
    ...variantBlocks,
    ...sizeBlocks,
  ],
} satisfies ComponentTokenSpec;
