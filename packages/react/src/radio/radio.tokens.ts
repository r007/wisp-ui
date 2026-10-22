/**
 * Which Material 3 tokens feed the Radio's private variables.
 *
 * As with the checkbox, the checked state lives in the native input, so selected
 * and unselected get distinct variable names and the CSS picks with `:checked`.
 * The radio publishes no focus-indicator tokens; the system ones apply.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.radio-button';

const ACTIVE = ['hover', 'focus', 'pressed'] as const;
const active = (path: string, lead = '') => ACTIVE.map((state) => `${lead}${state}.${path}`);
const sameWhenActive = (path: string, lead = '') => [`${lead}${path}`, ...active(path, lead)];

export default {
  name: 'Radio',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      vars: {
        'icon-size': 'icon.size',
        'state-layer-size': 'state-layer.size',

        // Unselected: the ring darkens when hovered, focused or pressed.
        'unselected-icon-color': 'unselected.icon.color',
        'unselected-icon-color-active': active('icon.color', 'unselected.'),
        'unselected-state-layer-color': [
          'unselected.hover.state-layer.color',
          'unselected.focus.state-layer.color',
        ],
        'unselected-pressed-state-layer-color': 'unselected.pressed.state-layer.color',

        // Selected.
        'selected-icon-color': sameWhenActive('icon.color', 'selected.'),
        'selected-state-layer-color': [
          'selected.hover.state-layer.color',
          'selected.focus.state-layer.color',
        ],
        'selected-pressed-state-layer-color': 'selected.pressed.state-layer.color',

        'hover-state-layer-opacity': [
          'selected.hover.state-layer.opacity',
          'unselected.hover.state-layer.opacity',
        ],
        'focus-state-layer-opacity': [
          'selected.focus.state-layer.opacity',
          'unselected.focus.state-layer.opacity',
        ],
        'pressed-state-layer-opacity': [
          'selected.pressed.state-layer.opacity',
          'unselected.pressed.state-layer.opacity',
        ],

        'disabled-icon-color': ['disabled.selected.icon.color', 'disabled.unselected.icon.color'],
        'disabled-icon-opacity': [
          'disabled.selected.icon.opacity',
          'disabled.unselected.icon.opacity',
        ],
      },
    },
  ],
} satisfies ComponentTokenSpec;
