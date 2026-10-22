/**
 * Which Material 3 tokens feed the Chip's private variables.
 *
 * Geometry, shape, outline, disabled and state-layer opacities come from the shared
 * `md.comp.chips` namespace, which carries the Expressive shape morph (unselected
 * 12px, selected fully round, pressed 8px). The older per-type namespaces
 * (`assist-chip`, `filter-chip`, …) still publish 8px corners, so they are used
 * only for what the shared one lacks: label, icon and state-layer colours, which
 * differ per type, and the elevated container.
 *
 * Filter and input chips are toggles, so each gets a `.selected` and `.unselected`
 * block, applied by the component the way the Button applies its own.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const SHARED = 'md.comp.chips';

/** Hover, focus and press. Chips here are not draggable, so `dragged` is unused. */
const STATES = ['hover', 'focus', 'pressed'] as const;
/** `lead` + `state.` + `path` for each interaction state, e.g. `hover.label-text.color`. */
const active = (path: string, lead = '') => STATES.map((state) => `${lead}${state}.${path}`);
/** The resting token plus its interaction siblings, which must all match. */
const same = (path: string, lead = '') => [`${lead}${path}`, ...active(path, lead)];

/** The elevated container's tokens, shared by assist, filter and suggestion chips. */
const elevated = {
  'elevated-elevation': 'elevated.container.elevation',
  'elevated-hover-elevation': 'elevated.hover.container.elevation',
  'elevated-focus-elevation': 'elevated.focus.container.elevation',
  'elevated-pressed-elevation': 'elevated.pressed.container.elevation',
  'disabled-elevated-container-color': 'elevated.disabled.container.color',
  'disabled-elevated-container-opacity': 'elevated.disabled.container.opacity',
  'disabled-elevated-elevation': 'elevated.disabled.container.elevation',
} as const;

/** Single-action chips with no selection: assist and suggestion. */
const plain = (name: 'assist' | 'suggestion', iconLead: string, iconPath: string): TokenBlock => ({
  selector: `.${name}`,
  prefix: `md.comp.${name}-chip`,
  vars: {
    'label-color': same('label-text.color'),
    'icon-color': `${iconLead}${iconPath}`,
    'icon-color-active': active(iconPath, iconLead),
    'state-layer-color': active('state-layer.color'),
    'focus-outline-color': 'flat.focus.outline.color',
    'elevated-container-color': 'elevated.container.color',
    ...elevated,
  },
});

/** A toggle chip's colours for one selection: filter and input chips. */
const toggle = (
  prefix: 'md.comp.filter-chip' | 'md.comp.input-chip',
  selection: 'selected' | 'unselected',
  extra: Record<string, string | readonly string[]> = {},
): TokenBlock => ({
  selector: `.${prefix.endsWith('filter-chip') ? 'filter' : 'input'}.${selection}`,
  prefix,
  vars: {
    'label-color': same('label-text.color', `${selection}.`),
    'icon-color': `with-leading-icon.${selection}.leading-icon.color`,
    'icon-color-active': active('leading-icon.color', `with-leading-icon.${selection}.`),
    'trailing-icon-color': same('trailing-icon.color', `with-trailing-icon.${selection}.`),
    'state-layer-color': [
      `${selection}.hover.state-layer.color`,
      `${selection}.focus.state-layer.color`,
    ],
    'pressed-state-layer-color': `${selection}.pressed.state-layer.color`,
    ...extra,
  },
});

export default {
  name: 'Chip',
  blocks: [
    {
      selector: '.root',
      prefix: SHARED,
      // Corners animate between shapes, so "circular" needs a real radius.
      circularRadius: 'calc(var(--_height) / 2)',
      vars: {
        height: 'height',
        'unselected-shape': 'unselected.shape',
        'selected-shape': 'selected.shape',
        'pressed-shape': 'pressed.shape',
        'label-font': 'label-text',
        'icon-size': ['leading-icon.size', 'trailing-icon.size'],
        'avatar-size': 'avatar.size',
        'avatar-shape': 'avatar.shape',
        gap: 'gap.horizontal',
        'padding-leading': 'filter.padding.leading',
        'padding-trailing': 'filter.padding.trailing',
        'input-padding-leading': 'input.padding.leading',
        'input-padding-trailing': 'input.padding.trailing',
        'with-avatar-padding-leading': 'with-avatar.padding.leading',
        'with-leading-icon-padding-leading': 'with-leading-icon.padding.leading',
        'with-trailing-icon-padding-trailing': 'with-trailing-icon.padding.trailing',

        'unselected-outline-width': 'unselected.outline.width',
        'unselected-outline-color': 'unselected.outline.color',
        'selected-outline-width': 'selected.outline.width',
        'selected-container-color': 'selected.container.color',

        'hover-state-layer-opacity': [
          'selected.hovered.state-layer.opacity',
          'unselected.hovered.state-layer.opacity',
        ],
        'focus-state-layer-opacity': [
          'selected.focused.state-layer.opacity',
          'unselected.focused.state-layer.opacity',
        ],
        'pressed-state-layer-opacity': [
          'selected.pressed.state-layer.opacity',
          'unselected.pressed.state-layer.opacity',
        ],

        'disabled-label-color': 'disabled.label-text.color',
        'disabled-label-opacity': 'disabled.label-text.opacity',
        'disabled-icon-color': ['disabled.leading-icon.color', 'disabled.trailing-icon.color'],
        'disabled-icon-opacity': [
          'disabled.leading-icon.opacity',
          'disabled.trailing-icon.opacity',
        ],
        'disabled-avatar-opacity': 'disabled.avatar.opacity',
        'disabled-outline-color': 'unselected.disabled.outline.color',
        'disabled-outline-opacity': 'unselected.disabled.outline.opacity',
        'disabled-selected-container-color': 'selected.disabled.container.color',
        'disabled-selected-container-opacity': 'selected.disabled.container.opacity',

        'focus-indicator-color': 'focused.indicator.color',
        'focus-indicator-thickness': 'focused.indicator.thickness',
        'focus-indicator-outline-offset': 'focused.indicator.outline.offset',
      },
    },
    plain('assist', 'with-icon.', 'icon.color'),
    plain('suggestion', 'with-leading-icon.', 'leading-icon.color'),
    {
      selector: '.filter',
      prefix: 'md.comp.filter-chip',
      vars: {
        'focus-outline-color': 'flat.unselected.focus.outline.color',
        'flat-selected-hover-elevation': 'flat.selected.hover.container.elevation',
        ...elevated,
      },
    },
    toggle('md.comp.filter-chip', 'unselected', {
      'elevated-container-color': 'elevated.unselected.container.color',
    }),
    toggle('md.comp.filter-chip', 'selected', {
      'elevated-container-color': 'elevated.selected.container.color',
    }),
    {
      selector: '.input',
      prefix: 'md.comp.input-chip',
      vars: { 'focus-outline-color': 'unselected.focus.outline.color' },
    },
    toggle('md.comp.input-chip', 'unselected'),
    toggle('md.comp.input-chip', 'selected'),
  ],
} satisfies ComponentTokenSpec;
