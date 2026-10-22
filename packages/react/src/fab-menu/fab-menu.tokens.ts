/**
 * Which Material 3 Expressive tokens feed the FabMenu's private variables.
 *
 * A FAB menu is a FAB that opens into a stack of pill-shaped items. Closed, the toggle is an
 * ordinary `Fab`; open, it is the spec's "close button", which is that Fab's solid colour set
 * in a circle with a 20px icon. The `Fab` already carries those colours, elevations and states,
 * so only the shape and icon size come from here, handed over as Fab's public override
 * variables (see fab-menu.module.css). The items are drawn here, in the colour set's
 * `-container` colours.
 *
 * Every variable is named `item-*` or `close-*`, so none collides with a private variable of
 * the `Fab` inside the menu.
 */
import {
  type ComponentTokenSpec,
  sameInEveryState,
  stateLayerColor,
  type TokenBlock,
} from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.fab-menu';

const colorSet = (name: 'primary' | 'secondary' | 'tertiary'): TokenBlock => ({
  selector: `.${name}`,
  prefix: `${BASE}.${name}-container.list-item`,
  vars: {
    'item-container-color': 'container.color',
    'item-hover-elevation': 'hovered.container.elevation',
    'item-focus-elevation': 'focused.container.elevation',
    'item-pressed-elevation': 'pressed.container.elevation',
    'item-icon-color': sameInEveryState('icon.color'),
    'item-label-color': sameInEveryState('label-text.color'),
    'item-state-layer-color': stateLayerColor(),
    'item-hover-state-layer-opacity': 'hovered.state-layer.opacity',
    'item-focus-state-layer-opacity': 'focused.state-layer.opacity',
    'item-pressed-state-layer-opacity': 'pressed.state-layer.opacity',
  },
});

export default {
  name: 'FabMenu',
  blocks: [
    {
      selector: '.root',
      prefix: `${BASE}.close-button`,
      // The shape is animated (the toggle morphs from the FAB's rounded square), so it needs a
      // real radius to interpolate to: half the width.
      circularRadius: 'calc(var(--_close-width) / 2)',
      vars: {
        'close-gap': 'between-space',
        'close-width': 'container.width',
        'close-shape': 'container.shape',
        'close-icon-size': 'icon.size',
      },
    },
    {
      selector: '.root',
      prefix: `${BASE}.menu-item`,
      circularRadius: 'calc(var(--_item-height) / 2)',
      vars: {
        'item-gap': 'between-space',
        'item-height': 'container.height',
        'item-elevation': 'container.elevation',
        'item-shape': 'container.shape',
        'item-icon-size': 'icon.size',
        'item-icon-label-space': 'icon-label-space',
        'item-leading-space': 'leading-space',
        'item-trailing-space': 'trailing-space',
        'item-font': 'label-text',
      },
    },
    colorSet('primary'),
    colorSet('secondary'),
    colorSet('tertiary'),
  ],
} satisfies ComponentTokenSpec;
