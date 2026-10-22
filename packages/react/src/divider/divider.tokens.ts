/** Which Material 3 tokens feed the Divider's private variables. */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

export default {
  name: 'Divider',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.divider',
      vars: {
        color: 'color',
        thickness: 'thickness',
      },
    },
  ],
} satisfies ComponentTokenSpec;
