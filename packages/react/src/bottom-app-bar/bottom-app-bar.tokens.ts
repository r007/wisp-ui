/** Which Material 3 tokens feed the BottomAppBar's private variables. */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

export default {
  name: 'BottomAppBar',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.bottom-app-bar',
      vars: {
        'container-color': 'container.color',
        'container-elevation': 'container.elevation',
        'container-height': 'container.height',
        'container-shape': 'container.shape',
      },
    },
  ],
} satisfies ComponentTokenSpec;
