/**
 * Which Material 3 tokens feed the date picker's private variables.
 *
 * `md.comp.date-picker` has a `docked` set (under a text field: 360x456, 16px corners, 48px
 * days) and a `modal` one (in a dialog: 360x524, 28px corners, 40px days). They agree on every
 * colour, type style, state layer and the year grid, so those are one block (`.root`) that
 * asserts each pair is equal, and only the sizes, the shape and the docked picker's dimmed
 * neighbouring-month days differ (`.docked`, `.modal`). `md.comp.date-input` is the dialog's
 * text-entry mode, which is narrower (`.input`). The range picker's tokens (`.range`) are the
 * band behind a chosen range of days, and its window-filling container.
 *
 * Not used: the docked container's height (456), which is taller than a header and seven rows
 * of days by room this picker has no content for; it is as tall as they are. The docked picker's
 * header is two menu buttons, month and year, each opening a list (`docked.menu.*`); this port
 * gives both pickers one header, a single button that opens the year grid, so the list tokens
 * are not used either. The `circular` shapes are all circles.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const STATES = ['hover', 'focus', 'pressed'] as const;
/** The same token in the docked and the modal set, which must agree. */
const both = (path: string) => [`docked.${path}`, `modal.${path}`];
/** A token and its hover, focus and press siblings, in both sets. */
const everyState = (path: (state: string) => string) => STATES.map(path);

export default {
  name: 'DatePicker',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.date-picker',
      vars: {
        'container-color': both('container.color'),
        'container-elevation': both('container.elevation'),
        'container-width': both('container.width'),

        // The days.
        'date-font': both('date.label-text.type'),
        'date-layer-size': [
          'docked.date.state-layer.width',
          'docked.date.state-layer.height',
          'modal.date.state-layer.width',
          'modal.date.state-layer.height',
        ],
        'date-label-color': both('date.unselected.label-text.color'),
        'date-state-layer-color': STATES.flatMap((state) =>
          both(`date.unselected.${state}.state-layer.color`),
        ),
        'selected-container-color': both('date.selected.container.color'),
        'selected-label-color': both('date.selected.label-text.color'),
        'selected-state-layer-color': STATES.flatMap((state) =>
          both(`date.selected.${state}.state-layer.color`),
        ),
        'today-label-color': both('date.today.label-text.color'),
        'today-outline-color': both('date.today.container.outline.color'),
        'today-outline-width': both('date.today.container.outline.width'),
        'today-state-layer-color': STATES.flatMap((state) =>
          both(`date.today.${state}.state-layer.color`),
        ),
        'weekday-font': both('weekdays.label-text.type'),
        'weekday-color': both('weekdays.label-text.color'),

        // The button that names the month and opens the years.
        'menu-button-height': 'docked.menu-button.container.height',
        'menu-button-font': 'docked.menu-button.label-text.type',
        'menu-button-label-color': [
          'docked.menu-button.label-text.color',
          ...everyState((state) => `docked.menu-button.${state}.label-text.color`),
        ],
        'menu-button-icon-color': [
          'docked.menu-button.icon.color',
          ...everyState((state) => `docked.menu-button.${state}.icon.color`),
        ],
        'menu-button-icon-size': 'docked.menu-button.icon.size',
        'menu-button-state-layer-color': everyState(
          (state) => `docked.menu-button.${state}.state-layer.color`,
        ),

        // The year grid.
        'year-width': [
          'modal.year-selection.year.container.width',
          'modal.year-selection.year.state-layer.width',
        ],
        'year-height': [
          'modal.year-selection.year.container.height',
          'modal.year-selection.year.state-layer.height',
        ],
        'year-font': 'modal.year-selection.year.label-text.type',
        'year-label-color': 'modal.year-selection.year.unselected.label-text.color',
        'year-state-layer-color': everyState(
          (state) => `modal.year-selection.year.unselected.${state}.state-layer.color`,
        ),
        'year-selected-container-color': 'modal.year-selection.year.selected.container.color',
        'year-selected-label-color': 'modal.year-selection.year.selected.label-text.color',
        'year-selected-state-layer-color': everyState(
          (state) => `modal.year-selection.year.selected.${state}.state-layer.color`,
        ),

        // Interaction states are the same size everywhere.
        'hover-state-layer-opacity': [
          ...both('date.hover.state-layer.opacity'),
          'docked.menu-button.hover.state-layer.opacity',
          'modal.year-selection.year.hover.state-layer.opacity',
          'modal.range-selection.date.in-range.hover.state-layer.opacity',
        ],
        'focus-state-layer-opacity': [
          ...both('date.focus.state-layer.opacity'),
          'docked.menu-button.focus.state-layer.opacity',
          'modal.year-selection.year.focus.state-layer.opacity',
          'modal.range-selection.date.in-range.focus.state-layer.opacity',
        ],
        'pressed-state-layer-opacity': [
          ...both('date.pressed.state-layer.opacity'),
          'docked.menu-button.pressed.state-layer.opacity',
          'modal.year-selection.year.pressed.state-layer.opacity',
          'modal.range-selection.date.in-range.pressed.state-layer.opacity',
        ],
        'disabled-opacity': 'docked.menu-button.disabled.label-text.opacity',

        // The modal's large header, with the headline that is the chosen date.
        'header-height': 'modal.header.container.height',
        'headline-color': 'modal.header.headline.color',
        'headline-font': 'modal.header.headline.type',
        'supporting-color': 'modal.header.supporting-text.color',
        'supporting-font': 'modal.header.supporting-text.type',
      },
    },
    {
      selector: '.docked',
      prefix: 'md.comp.date-picker.docked',
      vars: {
        'container-shape': 'container.shape',
        'date-size': ['date.container.width', 'date.container.height'],
        'toolbar-height': 'header.height',
        'outside-month-color': 'date.unselected.outside-month.label-text.color',
        'outside-month-opacity': 'date.unselected.outside-month.label-text.opacity',
      },
    },
    {
      selector: '.modal',
      prefix: 'md.comp.date-picker.modal',
      vars: {
        'container-shape': 'container.shape',
        'container-height': 'container.height',
        'date-size': ['date.container.width', 'date.container.height'],
      },
    },
    {
      selector: '.range',
      prefix: 'md.comp.date-picker.modal.range-selection',
      vars: {
        // The band behind the days of a range, and what is inside it.
        'range-color': 'active-indicator.container.color',
        'range-height': 'active-indicator.container.height',
        'in-range-label-color': 'date.in-range.label-text.color',
        'in-range-state-layer-color': [
          'date.in-range.hover.state-layer.color',
          'date.in-range.focus.state-layer.color',
          'date.in-range.pressed.state-layer.color',
        ],
        // The range picker fills the window, so it has neither corners nor a shadow. (This block
        // follows `.modal`, whose shape and shadow it replaces when both are on one element.)
        'container-shape': 'container.shape',
        'container-elevation': 'container.elevation',
        'range-header-height': 'header.container.height',
        'range-headline-font': 'header.headline.type',
        'subhead-color': 'month.subhead.color',
        'subhead-font': 'month.subhead.type',
      },
    },
    {
      selector: '.input',
      prefix: 'md.comp.date-input.modal',
      vars: {
        'container-width': 'container.width',
        'container-height': 'container.height',
      },
    },
  ],
} satisfies ComponentTokenSpec;
