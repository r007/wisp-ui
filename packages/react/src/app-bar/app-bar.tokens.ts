/**
 * Which Material 3 Expressive tokens feed the TopAppBar's private variables.
 *
 * Small bars are 64px with the title in the row. Medium and large bars (the "flexible"
 * variants) put the title in a block under the row and fold it into the row when collapsed;
 * they publish a height without and with a subtitle. The older fixed `medium` and `large`
 * tokens are not used.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.app-bar';

export default {
  name: 'TopAppBar',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      vars: {
        'container-color': 'container.color',
        'container-elevation': 'container.elevation',
        'container-shape': 'container.shape',
        'scrolled-color': 'on-scroll.container.color',
        'scrolled-elevation': 'on-scroll.container.elevation',
        'row-height': 'small.container.height',
        'leading-space': 'leading-space',
        'trailing-space': 'trailing-space',
        'icon-button-space': 'icon-button-space',
        'title-color': 'title.color',
        'subtitle-color': 'subtitle.color',
        'small-title-font': 'small.title.font',
        'small-subtitle-font': 'small.subtitle.font',
      },
    },
    {
      selector: '.medium',
      prefix: `${BASE}.medium-flexible`,
      vars: {
        height: 'container.height',
        'subtitle-height': 'with-subtitle.container.height',
        'title-font': 'title.font',
        'subtitle-font': 'subtitle.font',
      },
    },
    {
      selector: '.large',
      prefix: `${BASE}.large-flexible`,
      vars: {
        height: 'container.height',
        'subtitle-height': 'with-subtitle.container.height',
        'title-font': 'title.font',
        'subtitle-font': 'subtitle.font',
      },
    },
  ],
} satisfies ComponentTokenSpec;
