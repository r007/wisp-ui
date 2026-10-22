/**
 * Which Material 3 tokens feed the Snackbar's private variables.
 *
 * The action and the close button sit on the snackbar's dark container, so they use the
 * inverse colours. The close button publishes its own state tokens (`icon.*`); the action's
 * are `action.*`.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const STATES = ['hover', 'focus', 'pressed'] as const;
const same = (path: string, lead = '') => [
  `${lead}${path}`,
  ...STATES.map((s) => `${lead}${s}.${path}`),
];

export default {
  name: 'Snackbar',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.snackbar',
      vars: {
        'container-color': 'container.color',
        'container-shape': 'container.shape',
        'container-elevation': 'container.elevation',
        'single-line-height': 'with-single-line.container.height',
        'two-line-height': 'with-two-lines.container.height',
        'text-color': 'supporting-text.color',
        'text-font': 'supporting-text.type',

        'action-color': same('label-text.color', 'action.'),
        'action-font': 'action.label-text.type',
        'action-state-layer-color': STATES.map((s) => `action.${s}.state-layer.color`),
        'action-hover-opacity': 'action.hover.state-layer.opacity',
        'action-focus-opacity': 'action.focus.state-layer.opacity',
        'action-pressed-opacity': 'action.pressed.state-layer.opacity',

        'icon-size': 'icon.size',
        'icon-color': ['icon.color', ...STATES.map((s) => `icon.${s}.icon.color`)],
        'icon-state-layer-color': STATES.map((s) => `icon.${s}.state-layer.color`),
        'icon-hover-opacity': 'icon.hover.state-layer.opacity',
        'icon-focus-opacity': 'icon.focus.state-layer.opacity',
        'icon-pressed-opacity': 'icon.pressed.state-layer.opacity',
      },
    },
  ],
} satisfies ComponentTokenSpec;
