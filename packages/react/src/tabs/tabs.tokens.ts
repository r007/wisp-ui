/**
 * Which Material 3 tokens feed the Tabs' private variables.
 *
 * Primary and secondary tabs publish the same states in different shapes: primary tabs name
 * them `active`/`inactive` and tint the state layer by activity; secondary tabs keep one
 * state layer and change only the label and icon colours. The CSS reads one set of variables,
 * so each block maps its tokens onto the same names.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const PRIMARY = 'md.comp.primary-navigation-tab';
const SECONDARY = 'md.comp.secondary-navigation-tab';
const STATES = ['hover', 'focus', 'pressed'] as const;
const active = (path: string, lead = '') => STATES.map((state) => `${lead}${state}.${path}`);

export default {
  name: 'Tabs',
  blocks: [
    {
      selector: '.primary',
      prefix: PRIMARY,
      vars: {
        'container-color': 'container.color',
        'container-height': 'container.height',
        'stacked-height': 'with-icon-and-label-text.container.height',
        'indicator-color': 'active-indicator.color',
        'indicator-height': 'active-indicator.height',
        'indicator-shape': 'active-indicator.shape',
        'label-font': 'with-label-text.label-text.type',
        'icon-size': 'with-icon.icon.size',

        // Active tabs keep one colour; inactive ones darken when interacted with.
        'active-label-color': [
          'with-label-text.active.label-text.color',
          ...active('label-text.color', 'with-label-text.active.'),
        ],
        'active-icon-color': [
          'with-icon.active.icon.color',
          ...active('icon.color', 'with-icon.active.'),
        ],
        'inactive-label-color': 'with-label-text.inactive.label-text.color',
        'inactive-label-color-active': active('label-text.color', 'with-label-text.inactive.'),
        'inactive-icon-color': 'with-icon.inactive.icon.color',
        'inactive-icon-color-active': active('icon.color', 'with-icon.inactive.'),

        // The state layer is tinted by activity, and pressing tints it the other way.
        'active-state-layer-color': active('state-layer.color', 'active.'),
        'inactive-state-layer-color': [
          'inactive.hover.state-layer.color',
          'inactive.focus.state-layer.color',
        ],
        'inactive-pressed-state-layer-color': 'inactive.pressed.state-layer.color',
        'hover-state-layer-opacity': [
          'active.hover.state-layer.opacity',
          'inactive.hover.state-layer.opacity',
        ],
        'focus-state-layer-opacity': [
          'active.focus.state-layer.opacity',
          'inactive.focus.state-layer.opacity',
        ],
        'pressed-state-layer-opacity': [
          'active.pressed.state-layer.opacity',
          'inactive.pressed.state-layer.opacity',
        ],

        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
    {
      selector: '.secondary',
      prefix: SECONDARY,
      vars: {
        'container-color': 'container.color',
        'container-height': 'container.height',
        'indicator-color': 'active-indicator.color',
        'indicator-height': 'active-indicator.height',
        'label-font': 'label-text.type',
        'icon-size': 'with-icon.icon.size',

        'active-label-color': 'active.label-text.color',
        'active-icon-color': 'with-icon.active.icon.color',
        'inactive-label-color': 'inactive.label-text.color',
        'inactive-label-color-active': [
          'hover.label-text.color',
          'focus.label-text.color',
          'pressed.label-text.color',
        ],
        'inactive-icon-color': 'with-icon.inactive.icon.color',
        'inactive-icon-color-active': active('icon.color', 'with-icon.'),

        // One state layer, whatever the activity.
        'active-state-layer-color': active('state-layer.color'),
        'inactive-state-layer-color': [
          'hover.state-layer.color',
          'focus.state-layer.color',
          'pressed.state-layer.color',
        ],
        'inactive-pressed-state-layer-color': 'pressed.state-layer.color',
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
