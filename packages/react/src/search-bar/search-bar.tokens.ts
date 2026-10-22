/**
 * Which Material 3 Expressive tokens feed the SearchBar's private variables.
 *
 * Not used: the `contained.*` tokens (margins for a bar set inside an app bar) and the avatar
 * sizes, which belong to whatever the consumer puts in the trailing slot.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

export default {
  name: 'SearchBar',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.search-bar',
      circularRadius: 'calc(var(--_container-height) / 2)',
      vars: {
        'container-color': 'container.color',
        'container-elevation': 'container.elevation',
        'container-height': 'container.height',
        'container-shape': 'container.shape',
        'leading-space': 'leading-space',
        'trailing-space': 'trailing-space',
        'icon-size': 'icon.size',
        'icon-label-space': 'leading-icon.leading-icon-label-space',
        'label-trailing-space': 'trailing-icon.label-trailing-icon-space',
        'leading-icon-color': 'leading-icon.color',
        'trailing-icon-color': 'trailing-icon.color',
        'input-color': 'input-text.color',
        'input-font': 'input-text.type',
        'supporting-color': [
          'supporting-text.color',
          'hover.supporting-text.color',
          'pressed.supporting-text.color',
        ],
        'supporting-font': 'supporting-text.type',
        'state-layer-color': ['hover.state-layer.color', 'pressed.state-layer.color'],
        'hover-state-layer-opacity': 'hover.state-layer.opacity',
        'pressed-state-layer-opacity': 'pressed.state-layer.opacity',
        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
  ],
} satisfies ComponentTokenSpec;
