/**
 * Which Material 3 tokens feed the Dialog's private variables.
 *
 * Both variants are one component: a basic dialog floats over a scrim, a
 * full-screen dialog fills the window and has a header with a navigation icon,
 * a title and actions. Material publishes the actions' tokens here too
 * (`action.*`), but the actions are Buttons and use the Button's own tokens.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

export default {
  name: 'Dialog',
  blocks: [
    {
      selector: '.basic',
      prefix: 'md.comp.dialog',
      vars: {
        'container-color': 'container.color',
        'container-elevation': 'container.elevation',
        'container-shape': 'container.shape',
        'headline-color': 'headline.color',
        'headline-font': 'headline.type',
        'supporting-text-color': 'supporting-text.color',
        'supporting-text-font': 'supporting-text.type',
        'icon-color': 'with-icon.icon.color',
        'icon-size': 'with-icon.icon.size',
      },
    },
    {
      selector: '.fullscreen',
      prefix: 'md.comp.full-screen-dialog',
      vars: {
        'container-color': 'container.color',
        'container-elevation': 'container.elevation',
        'container-shape': 'container.shape',
        'header-color': 'header.container.color',
        'header-elevation': 'header.container.elevation',
        'header-height': 'header.container.height',
        'header-scrolled-color': 'header.on-scroll.container.color',
        'header-scrolled-elevation': 'header.on-scroll.container.elevation',
        'headline-color': 'header.headline.color',
        'headline-font': 'header.headline.type',
        'icon-color': 'header.icon.color',
        'icon-size': 'header.icon.size',
      },
    },
  ],
} satisfies ComponentTokenSpec;
