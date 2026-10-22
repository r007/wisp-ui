/**
 * Which Material 3 Expressive tokens feed the Toolbar's private variables.
 *
 * A toolbar is a container for controls: docked (a full-width 64px bar) or floating (a pill, with
 * elevation). Its two colour schemes, `standard` and `vibrant`, publish the colours of the
 * controls inside it too. Those controls are IconButtons and Buttons with their own tokens, so the
 * toolbar hands its colours to them through Material's *public* override variables (see
 * toolbar.module.css), not by restyling them.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.toolbar';

const scheme = (name: 'standard' | 'vibrant'): TokenBlock => ({
  selector: `.${name}`,
  prefix: `${BASE}.${name}`,
  vars: {
    'container-color': 'container.color',
    'icon-color': 'icon.color',
    'state-layer-color': 'hovered.state-layer.color',
    'selected-container-color': 'selected.button.container.color',
    'selected-icon-color': 'selected.icon.color',
    'selected-state-layer-color': 'selected.hovered.state-layer.color',
  },
});

export default {
  name: 'Toolbar',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      // A floating toolbar is a pill, which animates nothing here, so a large radius will do.
      circularRadius: '9999px',
      vars: {
        'docked-height': 'docked.container.height',
        'docked-leading-space': 'docked.container.leading-space',
        'docked-trailing-space': 'docked.container.trailing-space',
        'docked-min-spacing': 'docked.container.min-spacing',
        'docked-shape': 'docked.container.shape',
        'floating-height': 'floating.horizontal.container.height',
        'floating-width': 'floating.vertical.container.width',
        'floating-gap': 'floating.container.between-space',
        'floating-leading-space': 'floating.container.leading-space',
        'floating-trailing-space': 'floating.container.trailing-space',
        'floating-elevation': 'floating.container.elevation',
        'floating-shape': 'floating.container.shape',
        'fab-gap': 'floating.fab.between-space',
      },
    },
    scheme('standard'),
    scheme('vibrant'),
  ],
} satisfies ComponentTokenSpec;
