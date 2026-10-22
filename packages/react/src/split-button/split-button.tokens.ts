/**
 * Which Material 3 Expressive tokens feed the SplitButton's private variables.
 *
 * A split button is two buttons 2px apart: the action, and a chevron that opens a menu. Their
 * touching corners are small, rounding to 12px on hover and press, and the menu button rounds
 * fully while its menu is open. The buttons themselves are `Button`s in a connected group, so the
 * corner variables are the ones the Button reads (`--_inner`, `--_hover-inner`, `--_pressed-inner`,
 * `--_outer`); the rest only adjust the two buttons' padding and the chevron's size.
 *
 * The published "selected" corner (50) is a percentage of the height; the full outer shape does
 * the same job for a pill, so that is used.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.split-button';
const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

const size = (name: (typeof sizes)[number]): TokenBlock => ({
  selector: `.size-${name}`,
  prefix: `${BASE}.${name}`,
  // The ends are fully round, and they animate with the buttons, so "circular" needs a radius.
  circularRadius: 'calc(var(--_height) / 2)',
  vars: {
    height: 'container.height',
    'between-space': 'between-space',
    inner: 'inner-corner.corner-size',
    'hover-inner': 'inner-corner.hovered.corner-size',
    'pressed-inner': 'inner-corner.pressed.corner-size',
    outer: 'container.shape',
    'action-leading-space': 'leading-button.leading-space',
    'action-trailing-space': 'leading-button.trailing-space',
    'menu-leading-space': 'trailing-button.leading-space',
    'menu-trailing-space': 'trailing-button.trailing-space',
    'menu-icon-size': 'trailing-button.icon.size',
  },
});

export default {
  name: 'SplitButton',
  blocks: sizes.map(size),
} satisfies ComponentTokenSpec;
