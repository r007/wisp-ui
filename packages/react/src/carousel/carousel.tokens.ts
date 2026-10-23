/**
 * Which Material 3 Expressive tokens feed the Carousel item's private variables.
 *
 * An item is a surface with 28px corners that clips its content. A carousel item can be pressed
 * (it is then a link or a button): hover, focus and press tint it. Not used: the elevations
 * (the item sits inside a clipping viewport, which would cut a shadow off) and the outline
 * tokens (`with-outline.*`), for an outlined item: these items are the filled kind, covered by
 * their content, usually an image.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.carousel-item';

export default {
  name: 'Carousel',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      vars: {
        'container-color': 'container.color',
        'container-shape': 'container.shape',
        'state-layer-color': [
          'hover.state-layer.color',
          'focus.state-layer.color',
          'pressed.state-layer.color',
        ],
        'hover-state-layer-opacity': 'hover.state-layer.opacity',
        'focus-state-layer-opacity': 'focus.state-layer.opacity',
        'pressed-state-layer-opacity': 'pressed.state-layer.opacity',
        'disabled-opacity': 'disabled.container.opacity',
        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
  ],
} satisfies ComponentTokenSpec;
