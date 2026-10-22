/**
 * Which Material 3 tokens feed the Card's private variables.
 *
 * The three variants publish the same states (hover, focus, pressed, dragged) with
 * different values, so one builder produces a block per variant. Outlined cards
 * have an outline instead of a disabled container.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const STATES = ['hover', 'focus', 'pressed', 'dragged'] as const;

const variant = (name: 'elevated' | 'filled' | 'outlined'): TokenBlock => {
  const outlined = name === 'outlined';
  return {
    selector: `.${name}`,
    prefix: `md.comp.${name}-card`,
    vars: {
      'container-color': 'container.color',
      'container-shape': 'container.shape',
      'container-elevation': 'container.elevation',
      'hover-elevation': 'hover.container.elevation',
      'focus-elevation': 'focus.container.elevation',
      'pressed-elevation': 'pressed.container.elevation',
      'dragged-elevation': 'dragged.container.elevation',

      'state-layer-color': STATES.map((state) => `${state}.state-layer.color`),
      'hover-state-layer-opacity': 'hover.state-layer.opacity',
      'focus-state-layer-opacity': 'focus.state-layer.opacity',
      'pressed-state-layer-opacity': 'pressed.state-layer.opacity',
      'dragged-state-layer-opacity': 'dragged.state-layer.opacity',

      'focus-indicator-color': 'focus.indicator.color',
      'focus-indicator-thickness': 'focus.indicator.thickness',
      'focus-indicator-outline-offset': 'focus.indicator.outline.offset',

      'disabled-elevation': 'disabled.container.elevation',
      ...(outlined
        ? {
            'outline-width': 'outline.width',
            // Only the focused card's outline differs from the resting one.
            'outline-color': [
              'outline.color',
              'hover.outline.color',
              'pressed.outline.color',
              'dragged.outline.color',
            ],
            'focus-outline-color': 'focus.outline.color',
            'disabled-outline-color': 'disabled.outline.color',
            'disabled-outline-opacity': 'disabled.outline.opacity',
          }
        : {
            'disabled-container-color': 'disabled.container.color',
            'disabled-container-opacity': 'disabled.container.opacity',
          }),
    },
  };
};

export default {
  name: 'Card',
  blocks: [variant('elevated'), variant('filled'), variant('outlined')],
} satisfies ComponentTokenSpec;
