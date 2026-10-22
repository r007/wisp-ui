/**
 * Which Material 3 Expressive tokens feed the IconButton's private variables.
 * See button.tokens.ts for how specs work; `pnpm codegen tokens md.comp.icon-button`
 * lists what exists.
 */
import {
  type ComponentTokenSpec,
  sameInEveryState,
  stateLayerColor,
  type TokenBlock,
} from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.icon-button';

const variants = [
  { name: 'standard', container: false, outline: false },
  { name: 'filled', container: true, outline: false },
  { name: 'tonal', container: true, outline: false },
  { name: 'outlined', container: false, outline: true },
] as const;

const variantBlocks = variants.flatMap(({ name, container, outline }): TokenBlock[] => {
  const prefix = `${BASE}.${name}`;

  const rest: TokenBlock = {
    selector: `.${name}`,
    prefix,
    vars: {
      ...(container && {
        'container-color': 'container.color',
        'disabled-container-color': 'disabled.container.color',
      }),
      'icon-color': sameInEveryState('icon.color'),
      'state-layer-color': stateLayerColor(),
      'disabled-icon-color': 'disabled.icon.color',
      ...(outline && {
        'outline-color': 'outline.color',
        'disabled-outline-color': 'disabled.outline.color',
      }),
    },
  };

  const selected: TokenBlock = {
    selector: `.${name}.selected`,
    prefix: `${prefix}.selected`,
    vars: {
      // Standard has no container; every other variant fills when selected.
      ...(name !== 'standard' && { 'container-color': 'container.color' }),
      'icon-color': sameInEveryState('icon.color'),
      'state-layer-color': stateLayerColor(),
      // Outlined becomes a filled inverse-surface button when selected.
      ...(outline && { 'disabled-container-color': 'disabled.container.color' }),
    },
  };

  const unselected: TokenBlock = {
    selector: `.${name}.unselected`,
    prefix: `${prefix}.unselected`,
    vars: {
      ...(container && { 'container-color': 'container.color' }),
      'icon-color': sameInEveryState('icon.color'),
      'state-layer-color': stateLayerColor(),
    },
  };

  return [rest, selected, unselected];
});

const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;
const widths = ['narrow', 'default', 'wide'] as const;

const sizeBlocks = sizes.map(
  (size): TokenBlock => ({
    selector: `.size-${size}`,
    prefix: `${BASE}.${size}`,
    circularRadius: 'calc(var(--_container-height) / 2)',
    vars: {
      'container-height': 'container.height',
      'icon-size': 'icon.size',
      // The width variants only differ in horizontal padding around the icon.
      ...Object.fromEntries(
        widths.flatMap((width) => [
          [`${width}-leading-space`, `${width}.leading-space`],
          [`${width}-trailing-space`, `${width}.trailing-space`],
        ]),
      ),
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
  name: 'IconButton',
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
        'disabled-icon-opacity': 'disabled.icon.opacity',
      },
    },
    ...variantBlocks,
    ...sizeBlocks,
  ],
} satisfies ComponentTokenSpec;
