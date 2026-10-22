/**
 * Which Material 3 tokens feed the TextField's private variables.
 *
 * Filled and outlined fields publish the same states (hover, focus, error, disabled)
 * under different prefixes, so one builder produces both blocks and only the
 * container differs: a filled field has a tinted container with an active indicator
 * line; an outlined one has an outline.
 *
 * Colours are read per state by the CSS: rest, hover (pointer over the field), focus
 * (focus within), and each again for `error`. Tokens that never change across states
 * are collapsed into one variable, and generation fails if upstream ever makes them
 * diverge.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

/** `hover`/`focus` and their `error.` twins, each with the state prefix first. */
const STATES = ['hover', 'focus', 'error.hover', 'error.focus', 'error'] as const;
const withStates = (path: string) => [path, ...STATES.map((state) => `${state}.${path}`)];

const field = (variant: 'filled' | 'outlined'): TokenBlock => {
  const filled = variant === 'filled';
  return {
    selector: `.${variant}`,
    prefix: `md.comp.${variant}-text-field`,
    vars: {
      'container-shape': 'container.shape',
      'icon-size': ['leading-icon.size', 'trailing-icon.size'],

      // Type.
      'input-font': 'input-text.type',
      'label-font': 'label-text.type',
      'supporting-font': 'supporting-text.type',

      // Text colours. The input text never changes with state.
      'input-color': withStates('input-text.color'),
      'placeholder-color': 'input-text.placeholder.color',
      'prefix-color': 'input-text.prefix.color',
      'suffix-color': 'input-text.suffix.color',
      'caret-color': 'caret.color',
      'error-caret-color': 'error.focus.caret.color',

      // Label.
      'label-color': 'label-text.color',
      'hover-label-color': 'hover.label-text.color',
      'focus-label-color': 'focus.label-text.color',
      'error-label-color': 'error.label-text.color',
      'error-hover-label-color': 'error.hover.label-text.color',
      'error-focus-label-color': 'error.focus.label-text.color',

      // Supporting text is neutral until the field is invalid.
      'supporting-color': [
        'supporting-text.color',
        'hover.supporting-text.color',
        'focus.supporting-text.color',
      ],
      'error-supporting-color': [
        'error.supporting-text.color',
        'error.hover.supporting-text.color',
        'error.focus.supporting-text.color',
      ],

      // Icons: the leading one never changes; the trailing one is red when invalid.
      'leading-icon-color': withStates('leading-icon.color'),
      'trailing-icon-color': [
        'trailing-icon.color',
        'hover.trailing-icon.color',
        'focus.trailing-icon.color',
      ],
      'error-trailing-icon-color': ['error.trailing-icon.color', 'error.focus.trailing-icon.color'],
      'error-hover-trailing-icon-color': 'error.hover.trailing-icon.color',

      // The line under (filled) or around (outlined) the field.
      ...(filled
        ? {
            'container-color': 'container.color',
            'line-color': 'active-indicator.color',
            'line-width': 'active-indicator.height',
            'hover-line-color': 'hover.active-indicator.color',
            'hover-line-width': 'hover.active-indicator.height',
            'focus-line-color': 'focus.active-indicator.color',
            'focus-line-width': 'focus.active-indicator.thickness',
            'error-line-color': [
              'error.active-indicator.color',
              'error.focus.active-indicator.color',
            ],
            'error-hover-line-color': 'error.hover.active-indicator.color',
            'hover-state-layer-color': ['hover.state-layer.color', 'error.hover.state-layer.color'],
            'hover-state-layer-opacity': [
              'hover.state-layer.opacity',
              'error.hover.state-layer.opacity',
            ],
            'disabled-container-color': 'disabled.container.color',
            'disabled-container-opacity': 'disabled.container.opacity',
            'disabled-line-color': 'disabled.active-indicator.color',
            'disabled-line-width': 'disabled.active-indicator.height',
            'disabled-line-opacity': 'disabled.active-indicator.opacity',
          }
        : {
            'line-color': 'outline.color',
            'line-width': 'outline.width',
            'hover-line-color': 'hover.outline.color',
            'hover-line-width': 'hover.outline.width',
            'focus-line-color': 'focus.outline.color',
            'focus-line-width': 'focus.outline.width',
            'error-line-color': ['error.outline.color', 'error.focus.outline.color'],
            'error-hover-line-color': 'error.hover.outline.color',
            'disabled-line-color': 'disabled.outline.color',
            'disabled-line-width': 'disabled.outline.width',
            'disabled-line-opacity': 'disabled.outline.opacity',
          }),

      // Disabled: fixed opacities of on-surface.
      'disabled-input-color': 'disabled.input-text.color',
      'disabled-input-opacity': 'disabled.input-text.opacity',
      'disabled-label-color': 'disabled.label-text.color',
      'disabled-label-opacity': 'disabled.label-text.opacity',
      'disabled-supporting-color': 'disabled.supporting-text.color',
      'disabled-supporting-opacity': 'disabled.supporting-text.opacity',
      'disabled-icon-color': ['disabled.leading-icon.color', 'disabled.trailing-icon.color'],
      'disabled-icon-opacity': ['disabled.leading-icon.opacity', 'disabled.trailing-icon.opacity'],
    },
  };
};

export default {
  name: 'TextField',
  blocks: [field('filled'), field('outlined')],
} satisfies ComponentTokenSpec;
