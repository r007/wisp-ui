/**
 * Which Material 3 tokens feed the SegmentedButton's private variables.
 *
 * Each segment is a native radio or checkbox, so its selection is the input's and the
 * selected and unselected values get distinct variable names (the CSS picks with `:checked`).
 * Hover, focus and press share one colour per selection, so they are collapsed and asserted.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.outlined-segmented-button';
const STATES = ['hover', 'focus', 'pressed'] as const;
const same = (path: string, lead: string, rest = `${lead}${path}`) => [
  rest,
  ...STATES.map((state) => `${lead}${state}.${path}`),
];

export default {
  name: 'SegmentedButton',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      // The ends are fully rounded, and animate, so "circular" needs a real radius.
      circularRadius: 'calc(var(--_container-height) / 2)',
      vars: {
        'container-height': 'container.height',
        shape: 'shape',
        'outline-width': 'outline.width',
        'outline-color': 'outline.color',
        'label-font': 'label-text.type',
        'icon-size': 'with-icon.icon.size',

        'selected-container-color': 'selected.container.color',
        'selected-label-color': same('label-text.color', 'selected.'),
        'selected-icon-color': same('icon.color', 'selected.', 'selected.with-icon.icon.color'),
        'selected-state-layer-color': STATES.map((state) => `selected.${state}.state-layer.color`),
        'unselected-label-color': same('label-text.color', 'unselected.'),
        'unselected-icon-color': same(
          'icon.color',
          'unselected.',
          'unselected.with-icon.icon.color',
        ),
        'unselected-state-layer-color': STATES.map(
          (state) => `unselected.${state}.state-layer.color`,
        ),
        'hover-state-layer-opacity': 'hover.state-layer.opacity',
        'focus-state-layer-opacity': 'focus.state-layer.opacity',
        'pressed-state-layer-opacity': 'pressed.state-layer.opacity',

        'disabled-label-color': 'disabled.label-text.color',
        'disabled-label-opacity': 'disabled.label-text.opacity',
        'disabled-icon-color': 'disabled.icon.color',
        'disabled-icon-opacity': 'disabled.icon.opacity',
        'disabled-outline-color': 'disabled.outline.color',
        'disabled-outline-opacity': 'disabled.outline.opacity',

        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
  ],
} satisfies ComponentTokenSpec;
