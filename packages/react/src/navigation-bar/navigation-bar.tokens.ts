/**
 * Material 3 Expressive navigation bar (`md.comp.nav-bar`): a 64px bar whose
 * items come in a vertical (icon over label) and a horizontal (icon beside
 * label) layout. This replaces the older `md.comp.navigation-bar` (80px).
 *
 * `container.elevation` is intentionally not mapped. Flutter renders the bar
 * with a transparent shadow, so its elevation shows only as the
 * `surface-container` tint; consumers may add a shadow themselves.
 */
import { type ComponentTokenSpec, stateLayerColor } from '@wisp-ui/codegen/spec';

const BAR = 'md.comp.nav-bar';
const ITEM = `${BAR}.item`;

/** `active.hovered.state-layer.color` + focused + pressed, which must match. */
const stateLayer = (selection: 'active' | 'inactive') => stateLayerColor(`${selection}.`);

export default {
  name: 'NavigationBar',
  blocks: [
    {
      selector: '.root',
      prefix: BAR,
      vars: {
        'container-color': 'container.color',
        'container-height': 'container.height',
        'container-shape': 'container.shape',
        'item-between-space': 'item.between-space',
      },
    },
    {
      selector: '.item',
      prefix: ITEM,
      vars: {
        'icon-size': 'icon.size',
        'label-font': ['vertical.label-text.font', 'horizontal.label-text.font'],

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

        // Vertical: a 56x32 pill over the label; 6px above and below the stack.
        'vertical-indicator-width': 'vertical.active-indicator.width',
        'vertical-indicator-height': 'vertical.active-indicator.height',
        'vertical-icon-label-space': 'vertical.active-indicator.icon-label-space',
        'vertical-padding-block': 'vertical.container.between-space',

        // Horizontal: a pill that hugs the icon and label.
        'horizontal-indicator-height': 'horizontal.active-indicator.height',
        'horizontal-leading-space': 'horizontal.active-indicator.leading-space',
        'horizontal-trailing-space': 'horizontal.active-indicator.trailing-space',
        'horizontal-icon-label-space': 'horizontal.active-indicator.icon-label-space',
      },
    },
  ],
} satisfies ComponentTokenSpec;
