/**
 * Which Material 3 tokens feed the Fab's private variables.
 *
 * One component covers the icon-only FAB (`md.comp.fab`) and the extended FAB with a
 * label (`md.comp.extended-fab`). They publish the same colours, elevations and state
 * layers per colour variant, so those come from `fab`; only the label colour and the
 * extended sizes come from `extended-fab`. Every variant publishes its states under
 * `hovered`/`focused`, except `surface`, which says `hover`/`focus`.
 *
 * Material's `circular` corner is never used here: FAB corners are rounded rectangles
 * (16, 20 and 28px) that Expressive morphs by size.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const FAB = 'md.comp.fab';
const EXTENDED = 'md.comp.extended-fab';

const colors = [
  { name: 'primary-container', hover: 'hovered', focus: 'focused' },
  { name: 'secondary-container', hover: 'hovered', focus: 'focused' },
  { name: 'tertiary-container', hover: 'hovered', focus: 'focused' },
  { name: 'primary', hover: 'hovered', focus: 'focused' },
  { name: 'secondary', hover: 'hovered', focus: 'focused' },
  { name: 'tertiary', hover: 'hovered', focus: 'focused' },
  { name: 'surface', hover: 'hover', focus: 'focus' },
] as const;

const colorBlocks = colors.flatMap(({ name, hover, focus }): TokenBlock[] => {
  const states = [hover, focus, 'pressed'] as const;
  return [
    {
      selector: `.${name}`,
      prefix: `${FAB}.${name}`,
      vars: {
        'container-color': 'container.color',
        elevation: 'container.elevation',
        'hover-elevation': `${hover}.container.elevation`,
        'focus-elevation': `${focus}.container.elevation`,
        'pressed-elevation': 'pressed.container.elevation',
        'icon-color': ['icon.color', ...states.map((state) => `${state}.icon.color`)],
        'state-layer-color': states.map((state) => `${state}.state-layer.color`),
        'hover-state-layer-opacity': `${hover}.state-layer.opacity`,
        'focus-state-layer-opacity': `${focus}.state-layer.opacity`,
        'pressed-state-layer-opacity': 'pressed.state-layer.opacity',
      },
    },
    {
      // The extended FAB's label has the icon's colour.
      selector: `.${name}`,
      prefix: `${EXTENDED}.${name}`,
      vars: {
        'label-color': ['label-text.color', ...states.map((state) => `${state}.label-text.color`)],
      },
    },
  ];
});

/** Icon-only sizes, then the extended ones. */
const sizes = [
  { name: 'small', fab: 'small.', extended: undefined },
  { name: 'default', fab: '', extended: '' },
  { name: 'medium', fab: 'medium.', extended: 'medium.' },
  { name: 'large', fab: 'large.', extended: 'large.' },
] as const;

const sizeBlocks = sizes.flatMap(({ name, fab, extended }): TokenBlock[] => {
  const blocks: TokenBlock[] = [
    {
      selector: `.size-${name}`,
      prefix: FAB,
      vars: {
        'container-height': `${fab}container.height`,
        'container-width': `${fab}container.width`,
        'container-shape': `${fab}container.shape`,
        'icon-size': `${fab}icon.size`,
      },
    },
  ];
  if (extended !== undefined) {
    blocks.push({
      selector: `.extended-${name}`,
      prefix: EXTENDED,
      vars: {
        'extended-height': `${extended}container.height`,
        'extended-shape': `${extended}container.shape`,
        'extended-icon-size': `${extended}icon.size`,
        'icon-label-space': `${extended}icon-label-space`,
        'leading-space': `${extended}leading-space`,
        'trailing-space': `${extended}trailing-space`,
        'label-font': `${extended}label-text`,
      },
    });
  }
  return blocks;
});

export default {
  name: 'Fab',
  blocks: [
    {
      selector: '.root',
      prefix: `${FAB}.surface`,
      vars: {
        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
    ...colorBlocks,
    {
      // A lowered surface FAB sits closer to the page.
      selector: '.lowered',
      prefix: `${FAB}.surface.lowered`,
      vars: {
        'container-color': 'container.color',
        elevation: 'container.elevation',
        'hover-elevation': 'hover.container.elevation',
        'focus-elevation': 'focus.container.elevation',
        'pressed-elevation': 'pressed.container.elevation',
      },
    },
    ...sizeBlocks,
  ],
} satisfies ComponentTokenSpec;
