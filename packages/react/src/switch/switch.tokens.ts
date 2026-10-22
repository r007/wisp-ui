/**
 * Which Material 3 tokens feed the Switch's private variables.
 *
 * A switch's checked state is the native input's, so it is not known to React
 * (uncontrolled use). Instead of per-state classes, selected/unselected values
 * get distinct variable names and the CSS picks between them with `:checked`.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.switch';

/** The switch names its interaction states `hover`/`focus`/`pressed`. */
const ACTIVE = ['hover', 'focus', 'pressed'] as const;
const active = (selection: 'selected' | 'unselected', path: string) =>
  ACTIVE.map((state) => `${selection}.${state}.${path}`);
/** The resting token plus its interaction siblings, which must all match. */
const sameWhenActive = (selection: 'selected' | 'unselected', path: string) => [
  `${selection}.${path}`,
  ...active(selection, path),
];

export default {
  name: 'Switch',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      vars: {
        // Geometry. Handles are circles, so width and height must agree.
        'track-width': 'track.width',
        'track-height': 'track.height',
        'track-outline-width': 'track.outline.width',
        'state-layer-size': 'state-layer.size',
        'unselected-handle-size': ['unselected.handle.width', 'unselected.handle.height'],
        'selected-handle-size': ['selected.handle.width', 'selected.handle.height'],
        'with-icon-handle-size': ['with-icon.handle.width', 'with-icon.handle.height'],
        'pressed-handle-size': ['pressed.handle.width', 'pressed.handle.height'],
        'icon-size': ['unselected.icon.size', 'selected.icon.size'],

        // Unselected.
        'unselected-track-color': sameWhenActive('unselected', 'track.color'),
        'unselected-track-outline-color': sameWhenActive('unselected', 'track.outline.color'),
        'unselected-handle-color': 'unselected.handle.color',
        'unselected-handle-color-active': active('unselected', 'handle.color'),
        'unselected-icon-color': sameWhenActive('unselected', 'icon.color'),
        'unselected-state-layer-color': active('unselected', 'state-layer.color'),

        // Selected.
        'selected-track-color': sameWhenActive('selected', 'track.color'),
        'selected-handle-color': 'selected.handle.color',
        'selected-handle-color-active': active('selected', 'handle.color'),
        'selected-icon-color': sameWhenActive('selected', 'icon.color'),
        'selected-state-layer-color': active('selected', 'state-layer.color'),

        // Opacity is the same for both selections.
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

        // Disabled.
        'disabled-track-opacity': 'disabled.track.opacity',
        'disabled-unselected-track-color': 'disabled.unselected.track.color',
        'disabled-unselected-track-outline-color': 'disabled.unselected.track.outline.color',
        'disabled-unselected-handle-color': 'disabled.unselected.handle.color',
        'disabled-unselected-handle-opacity': 'disabled.unselected.handle.opacity',
        'disabled-unselected-icon-color': 'disabled.unselected.icon.color',
        'disabled-unselected-icon-opacity': 'disabled.unselected.icon.opacity',
        'disabled-selected-track-color': 'disabled.selected.track.color',
        'disabled-selected-handle-color': 'disabled.selected.handle.color',
        'disabled-selected-handle-opacity': 'disabled.selected.handle.opacity',
        'disabled-selected-icon-color': 'disabled.selected.icon.color',
        'disabled-selected-icon-opacity': 'disabled.selected.icon.opacity',

        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.offset',
      },
    },
  ],
} satisfies ComponentTokenSpec;
