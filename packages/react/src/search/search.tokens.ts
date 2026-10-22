/**
 * Which Material 3 Expressive tokens feed the Search view's private variables.
 *
 * A search view is what a search bar opens into: a header (the input, with a back button and
 * a clear button) over a list of results. It is docked (laid over the bar, sized to it) or
 * full-screen. Not used: the `contained.*` tokens, a style for a bar set inside an app bar.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

export default {
  name: 'Search',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.search-view',
      vars: {
        'container-color': 'container.color',
        'container-elevation': 'container.elevation',
        'divider-color': 'divider.color',
        'leading-space': 'leading-space',
        'trailing-space': 'trailing-space',
        'icon-label-space': 'leading-icon.leading-icon-label-space',
        'label-trailing-space': 'trailing-icon.label-trailing-icon-space',
        'leading-icon-color': 'header.leading-icon.color',
        'trailing-icon-color': 'header.trailing-icon.color',
        'input-color': 'header.input-text.color',
        'input-font': 'header.input-text.type',
        'supporting-color': 'header.supporting-text.color',
        'supporting-font': 'header.supporting-text.type',
        'docked-shape': 'docked.container.shape',
        'docked-header-height': 'docked.header.container.height',
        'full-screen-shape': 'full-screen.container.shape',
        'full-screen-header-height': 'full-screen.header.container.height',
      },
    },
  ],
} satisfies ComponentTokenSpec;
