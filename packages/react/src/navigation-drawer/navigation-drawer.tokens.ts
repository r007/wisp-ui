/**
 * Material 3 navigation drawer (`md.comp.navigation-drawer`).
 *
 * The standard drawer is part of the page layout; the modal drawer is a native
 * `<dialog>` over a scrim. Both share the destination items.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const DRAWER = 'md.comp.navigation-drawer';
const states = ['hover', 'focus', 'pressed'] as const;
/** `active.hover.x`, `active.focus.x`, `active.pressed.x`: one value in all three. */
const interacting = (selection: 'active' | 'inactive', path: string) =>
  states.map((state) => `${selection}.${state}.${path}`);

export default {
  name: 'NavigationDrawer',
  blocks: [
    {
      selector: '.root',
      prefix: DRAWER,
      vars: {
        'container-width': 'container.width',
        'container-shape': 'container.shape',
        'modal-container-color': 'modal.container.color',
        'modal-container-elevation': 'modal.container.elevation',
        'standard-container-color': 'standard.container.color',
        'standard-container-elevation': 'standard.container.elevation',
        'headline-color': 'headline.color',
        'headline-font': 'headline.type',
      },
    },
    {
      selector: '.root',
      prefix: 'md.comp.divider',
      vars: {
        'divider-color': 'color',
        'divider-thickness': 'thickness',
      },
    },
    {
      selector: '.item',
      prefix: DRAWER,
      vars: {
        'icon-size': 'icon.size',
        'label-font': 'label-text.type',
        'trailing-font': 'large-badge-label.type',
        'trailing-color': 'large-badge-label.color',
        'indicator-color': 'active-indicator.color',
        'indicator-height': 'active-indicator.height',

        // Selected items keep one colour through every interaction state.
        'active-icon-color': ['active.icon.color', ...interacting('active', 'icon.color')],
        'active-label-color': [
          'active.label-text.color',
          ...interacting('active', 'label-text.color'),
        ],
        'active-state-layer-color': interacting('active', 'state-layer.color'),

        // Unselected items darken from on-surface-variant to on-surface when engaged.
        'inactive-icon-color': 'inactive.icon.color',
        'inactive-icon-color-active': interacting('inactive', 'icon.color'),
        'inactive-label-color': 'inactive.label-text.color',
        'inactive-label-color-active': interacting('inactive', 'label-text.color'),
        'inactive-state-layer-color': [
          'inactive.hover.state-layer.color',
          'inactive.focus.state-layer.color',
        ],
        // Pressing tints with the indicator's colour, so the pill reads as filling.
        'inactive-pressed-state-layer-color': 'inactive.pressed.state-layer.color',

        'hover-state-layer-opacity': 'hover.state-layer.opacity',
        'focus-state-layer-opacity': 'focus.state-layer.opacity',
        'pressed-state-layer-opacity': 'pressed.state-layer.opacity',

        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
  ],
} satisfies ComponentTokenSpec;
