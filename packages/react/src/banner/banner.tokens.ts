/**
 * Which Material 3 tokens feed the Banner's private variables.
 *
 * Material publishes a desktop and a mobile height for each line count. The banner is as
 * tall as its content, with the single-line height as its minimum, so the multi-line heights
 * are the result of the text rather than inputs.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

export default {
  name: 'Banner',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.banner',
      vars: {
        'container-color': 'container.color',
        'container-elevation': 'container.elevation',
        'container-shape': 'container.shape',
        'text-color': 'supporting-text.color',
        'text-font': 'supporting-text.type',
        'min-height': 'desktop.with-single-line.container.height',
        'image-size': 'with-image.image.size',
        'image-shape': 'with-image.image.shape',
      },
    },
  ],
} satisfies ComponentTokenSpec;
