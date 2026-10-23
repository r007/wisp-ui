/**
 * Which Material 3 tokens feed the TimePicker's private variables.
 *
 * `md.comp.time-picker` is the picker with a clock dial; `md.comp.time-input` is the one with
 * text fields. They share a surface, a headline and the AM/PM selector, so the dial's tokens
 * are the base (`.root`) and the input's replace what differs (`.input`): the size of the
 * hour and minute boxes (fields of 96x72 instead of selectors of 96x80), their colour when
 * focused, the supporting text, and a shorter period selector.
 *
 * Not used: `clock-dial.shape` and the selector's circular shapes (all circles, drawn with a
 * full radius), and the focus indicator of the input fields (`time-input.focus.indicator.*`),
 * which the shared system tokens cover.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const STATES = ['hover', 'focus', 'pressed'] as const;
/** The resting token and its interaction siblings, which must all match. */
const everyState = (lead: string, path: string) => [
  `${lead}${path}`,
  ...STATES.map((state) => `${lead}${state}.${path}`),
];
/** The interaction siblings alone. */
const states = (lead: string, path: string) => STATES.map((state) => `${lead}${state}.${path}`);

const SELECTOR = 'time-selector.';
const PERIOD = 'period-selector.';

export default {
  name: 'TimePicker',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.time-picker',
      vars: {
        'container-color': 'container.color',
        'container-shape': 'container.shape',
        'container-elevation': 'container.elevation',
        'headline-color': 'headline.color',
        'headline-font': 'headline.type',

        // The hour and minute selector.
        'selector-width': `${SELECTOR}container.width`,
        'selector-width-24h': `${SELECTOR}24h-vertical.container.width`,
        'selector-height': `${SELECTOR}container.height`,
        'selector-shape': `${SELECTOR}container.shape`,
        'selector-font': `${SELECTOR}label-text.type`,
        'selector-selected-container-color': `${SELECTOR}selected.container.color`,
        'selector-selected-label-color': everyState(`${SELECTOR}selected.`, 'label-text.color'),
        'selector-selected-state-layer-color': states(`${SELECTOR}selected.`, 'state-layer.color'),
        'selector-unselected-container-color': `${SELECTOR}unselected.container.color`,
        'selector-unselected-label-color': everyState(`${SELECTOR}unselected.`, 'label-text.color'),
        'selector-unselected-state-layer-color': states(
          `${SELECTOR}unselected.`,
          'state-layer.color',
        ),
        'separator-color': `${SELECTOR}separator.color`,
        'separator-font': `${SELECTOR}separator.type`,

        // The AM/PM selector.
        'period-shape': `${PERIOD}container.shape`,
        'period-vertical-width': `${PERIOD}vertical.container.width`,
        'period-vertical-height': `${PERIOD}vertical.container.height`,
        'period-horizontal-width': `${PERIOD}horizontal.container.width`,
        'period-horizontal-height': `${PERIOD}horizontal.container.height`,
        'period-font': `${PERIOD}label-text.type`,
        'period-outline-color': `${PERIOD}outline.color`,
        'period-outline-width': `${PERIOD}outline.width`,
        'period-selected-container-color': `${PERIOD}selected.container.color`,
        'period-selected-label-color': everyState(`${PERIOD}selected.`, 'label-text.color'),
        'period-selected-state-layer-color': states(`${PERIOD}selected.`, 'state-layer.color'),
        'period-unselected-label-color': everyState(`${PERIOD}unselected.`, 'label-text.color'),
        'period-unselected-state-layer-color': states(`${PERIOD}unselected.`, 'state-layer.color'),

        // Interaction states are the same size on both selectors.
        'hover-state-layer-opacity': [
          `${SELECTOR}hover.state-layer.opacity`,
          `${PERIOD}hover.state-layer.opacity`,
        ],
        'focus-state-layer-opacity': [
          `${SELECTOR}focus.state-layer.opacity`,
          `${PERIOD}focus.state-layer.opacity`,
        ],
        'pressed-state-layer-opacity': [
          `${SELECTOR}pressed.state-layer.opacity`,
          `${PERIOD}pressed.state-layer.opacity`,
        ],

        // The dial.
        'dial-color': 'clock-dial.color',
        'dial-size': 'clock-dial.container.size',
        'dial-label-font': 'clock-dial.label-text.type',
        'dial-selected-label-color': 'clock-dial.selected.label-text.color',
        'dial-unselected-label-color': 'clock-dial.unselected.label-text.color',
        'dial-center-color': 'clock-dial.selector.center.container.color',
        'dial-center-size': 'clock-dial.selector.center.container.size',
        'dial-handle-color': 'clock-dial.selector.handle.container.color',
        'dial-handle-size': 'clock-dial.selector.handle.container.size',
        'dial-track-color': 'clock-dial.selector.track.container.color',
        'dial-track-width': 'clock-dial.selector.track.container.width',
      },
    },
    {
      selector: '.input',
      prefix: 'md.comp.time-input',
      vars: {
        'field-width': 'time-input-field.container.width',
        'field-height': 'time-input-field.container.height',
        'field-shape': 'time-input-field.container.shape',
        'field-font': 'time-input-field.label-text.type',
        'field-container-color': 'time-input-field.container.color',
        'field-label-color': 'time-input-field.label-text.color',
        'field-hover-label-color': 'time-input-field.hover.label-text.color',
        'field-hover-state-layer-color': 'time-input-field.hover.state-layer.color',
        'field-hover-state-layer-opacity': 'time-input-field.hover.state-layer.opacity',
        'field-focus-container-color': 'time-input-field.focus.container.color',
        'field-focus-label-color': 'time-input-field.focus.label-text.color',
        'field-focus-outline-color': 'time-input-field.focus.outline.color',
        'field-focus-outline-width': 'time-input-field.focus.outline.width',
        'supporting-color': 'time-input-field.supporting-text.color',
        'supporting-font': 'time-input-field.supporting-text.type',
        'input-period-width': 'period-selector.container.width',
        'input-period-height': 'period-selector.container.height',
      },
    },
  ],
} satisfies ComponentTokenSpec;
