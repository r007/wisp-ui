/**
 * Which Material 3 tokens feed the Tooltip's private variables.
 *
 * Plain tooltips are a dark label; rich tooltips are a surface with an optional subhead and
 * actions. Material publishes the actions' tokens here (`action.*`), but the actions are
 * Buttons and use the Button's own tokens.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

export default {
  name: 'Tooltip',
  blocks: [
    {
      selector: '.plain',
      prefix: 'md.comp.plain-tooltip',
      vars: {
        'container-color': 'container.color',
        'container-shape': 'container.shape',
        'text-color': 'supporting-text.color',
        'text-font': 'supporting-text.type',
      },
    },
    {
      selector: '.rich',
      prefix: 'md.comp.rich-tooltip',
      vars: {
        'container-color': 'container.color',
        'container-shape': 'container.shape',
        'container-elevation': 'container.elevation',
        'subhead-color': 'subhead.color',
        'subhead-font': 'subhead.type',
        'text-color': 'supporting-text.color',
        'text-font': 'supporting-text.type',
      },
    },
  ],
} satisfies ComponentTokenSpec;
