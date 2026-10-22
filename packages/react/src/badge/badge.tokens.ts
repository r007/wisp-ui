import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

/** A "small" badge is a dot; a "large" badge carries a short label. */
export default {
  name: 'Badge',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.badge',
      vars: {
        'small-size': 'size',
        'small-color': 'color',
        'large-size': 'large.size',
        'large-color': 'large.color',
        'large-label-color': 'large.label-text.color',
        'large-label-font': 'large.label-text.type',
      },
    },
  ],
} satisfies ComponentTokenSpec;
