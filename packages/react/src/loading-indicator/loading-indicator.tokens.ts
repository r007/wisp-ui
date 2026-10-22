/**
 * Which Material 3 Expressive tokens feed the LoadingIndicator's private variables.
 *
 * Uncontained, it is just the morphing shape in the primary colour; contained, the shape sits in
 * a primary-container circle and takes the on-primary-container colour.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.loading-indicator';

export default {
  name: 'LoadingIndicator',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      circularRadius: '9999px',
      vars: {
        'indicator-color': 'active-indicator.color',
        'indicator-size': 'active-indicator.size',
        'container-width': 'container.width',
        'container-height': 'container.height',
        'container-shape': 'container.shape',
      },
    },
    {
      selector: '.contained',
      prefix: `${BASE}.contained`,
      vars: {
        'indicator-color': 'active-indicator.color',
        'container-color': 'container.color',
      },
    },
  ],
} satisfies ComponentTokenSpec;
