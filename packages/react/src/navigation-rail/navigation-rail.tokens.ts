/**
 * Material 3 Expressive navigation rail (`md.comp.nav-rail`): a narrow column of destinations
 * that expands to a wide one with the label beside the icon. This replaces the older
 * `md.comp.navigation-rail`.
 *
 * Collapsed items are vertical (icon over label, a 56x32 pill); expanded items are horizontal
 * (icon beside label, a 56px-tall pill that spans the rail).
 */
import { type ComponentTokenSpec, stateLayerColor } from '@wisp-ui/codegen/spec';

const RAIL = 'md.comp.nav-rail';
const ITEM = `${RAIL}.item`;

/** `active.hovered.state-layer.color` + focused + pressed, which must match. */
const stateLayer = (selection: 'active' | 'inactive') => stateLayerColor(`${selection}.`);

export default {
  name: 'NavigationRail',
  blocks: [
    {
      selector: '.root',
      prefix: RAIL,
      vars: {
        'container-color': ['collapsed.container.color', 'expanded.container.color'],
        'container-shape': ['collapsed.container.shape', 'expanded.container.shape'],
        'collapsed-width': 'collapsed.container.width',
        'narrow-width': 'collapsed.narrow.container.width',
        'expanded-min-width': 'expanded.container.width.minimum',
        'expanded-max-width': 'expanded.container.width.maximum',
        'top-space': ['collapsed.top-space', 'expanded.top-space'],
        'collapsed-item-space': 'collapsed.item.vertical-space',
        'expanded-item-space': 'item.container.vertical-space',
        // An expanded rail keeps its pills this far from its edges.
        'expanded-side-space': 'item.horizontal.full-width.leading-space',
      },
    },
    {
      selector: '.item',
      prefix: ITEM,
      vars: {
        'icon-size': 'icon.size',
        'vertical-label-font': 'vertical.label-text.font',
        'horizontal-label-font': 'horizontal.label-text.font',

        'indicator-color': 'active.indicator.color',
        'active-icon-color': 'active.icon.color',
        'inactive-icon-color': 'inactive.icon.color',
        'active-label-color': 'active.label-text.color',
        'inactive-label-color': 'inactive.label-text.color',
        'active-state-layer-color': stateLayer('active'),
        'inactive-state-layer-color': stateLayer('inactive'),
        // Only the active item publishes opacities; they apply to both.
        'hover-state-layer-opacity': 'active.hovered.state-layer.opacity',
        'focus-state-layer-opacity': 'active.focused.state-layer.opacity',
        'pressed-state-layer-opacity': 'active.pressed.state-layer.opacity',

        // Collapsed: a 56x32 pill over the label, in a 64px item.
        'vertical-height': 'container.height',
        'vertical-indicator-width': 'vertical.active-indicator.width',
        'vertical-indicator-height': 'vertical.active-indicator.height',
        'vertical-icon-label-space': 'vertical.icon-label-space',

        // Expanded: a pill that spans the rail, with the icon and label inside it.
        'horizontal-indicator-height': 'horizontal.active-indicator.height',
        'horizontal-leading-space': 'horizontal.full-width.leading-space',
        'horizontal-trailing-space': 'horizontal.full-width.trailing-space',
        'horizontal-icon-label-space': 'horizontal.icon-label-space',
      },
    },
  ],
} satisfies ComponentTokenSpec;
