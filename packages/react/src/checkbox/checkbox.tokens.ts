/**
 * Which Material 3 tokens feed the Checkbox's private variables.
 *
 * Like the switch, a checkbox's state lives in the native input, so selected and
 * unselected values get distinct variable names and the CSS picks with `:checked`
 * and `:indeterminate`. Material gives an indeterminate box the selected look.
 *
 * The pressed state layer is tinted with the opposite colour to hover and focus
 * (primary when unselected, on-surface when selected), so it has its own variable.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.checkbox';

/** The checkbox names its interaction states `hover`/`focus`/`pressed`. */
const ACTIVE = ['hover', 'focus', 'pressed'] as const;
const active = (path: string, lead = '') => ACTIVE.map((state) => `${lead}${state}.${path}`);
/** The resting token plus its interaction siblings, which must all match. */
const sameWhenActive = (path: string, lead = '') => [`${lead}${path}`, ...active(path, lead)];

export default {
  name: 'Checkbox',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      vars: {
        // Geometry.
        'container-size': 'container.size',
        'container-shape': 'container.shape',
        'icon-size': 'icon.size',
        'state-layer-size': 'state-layer.size',
        'unselected-outline-width': sameWhenActive('outline.width', 'unselected.'),

        // Unselected: the outline darkens when hovered, focused or pressed.
        'unselected-outline-color': 'unselected.outline.color',
        'unselected-outline-color-active': active('outline.color', 'unselected.'),
        'unselected-state-layer-color': [
          'unselected.hover.state-layer.color',
          'unselected.focus.state-layer.color',
        ],
        'unselected-pressed-state-layer-color': 'unselected.pressed.state-layer.color',

        // Selected (and indeterminate): a filled container with a contrasting mark.
        'selected-container-color': sameWhenActive('container.color', 'selected.'),
        'selected-icon-color': sameWhenActive('icon.color', 'selected.'),
        'selected-outline-width': sameWhenActive('outline.width', 'selected.'),
        'selected-state-layer-color': [
          'selected.hover.state-layer.color',
          'selected.focus.state-layer.color',
        ],
        'selected-pressed-state-layer-color': 'selected.pressed.state-layer.color',

        // Opacity is the same for both selections and for the error state.
        'hover-state-layer-opacity': [
          'selected.hover.state-layer.opacity',
          'unselected.hover.state-layer.opacity',
          'error.hover.state-layer.opacity',
        ],
        'focus-state-layer-opacity': [
          'selected.focus.state-layer.opacity',
          'unselected.focus.state-layer.opacity',
          'error.focus.state-layer.opacity',
        ],
        'pressed-state-layer-opacity': [
          'selected.pressed.state-layer.opacity',
          'unselected.pressed.state-layer.opacity',
          'error.pressed.state-layer.opacity',
        ],

        // Error: every state of an invalid box uses the same colours.
        'error-outline-color': sameWhenActive('outline.color', 'unselected.error.'),
        'error-container-color': sameWhenActive('container.color', 'selected.error.'),
        'error-icon-color': sameWhenActive('icon.color', 'selected.error.'),
        'error-state-layer-color': active('state-layer.color', 'error.'),

        // Disabled.
        'disabled-container-opacity': [
          'selected.disabled.container.opacity',
          'unselected.disabled.container.opacity',
        ],
        'disabled-unselected-outline-color': 'unselected.disabled.outline.color',
        'disabled-selected-container-color': 'selected.disabled.container.color',
        'disabled-selected-icon-color': 'selected.disabled.icon.color',

        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
  ],
} satisfies ComponentTokenSpec;
