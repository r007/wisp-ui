/**
 * Which Material 3 Expressive tokens feed the ButtonGroup's private variables.
 *
 * A standard group is buttons a few pixels apart, by size. A connected group is buttons 2px apart
 * whose touching corners are small (rounding further while pressed, and fully when selected) and
 * whose outer ends are fully round. Buttons in a connected group read the corner variables
 * (`--_inner`, `--_pressed-inner`, `--_outer`), which is the one place the Button depends on its
 * parent's variables.
 *
 * The published "selected" inner corner is 50, which only makes sense as a percentage of the
 * height; the full ("circular") outer shape does the same job for a pill, so that is used.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.button-group';
const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

const standard = (size: (typeof sizes)[number]): TokenBlock => ({
  selector: `.standard-${size}`,
  prefix: `${BASE}.standard.${size}`,
  vars: { 'between-space': 'between-space' },
});

const connected = (size: (typeof sizes)[number]): TokenBlock => ({
  selector: `.connected-${size}`,
  prefix: `${BASE}.connected.${size}`,
  // The ends are fully round, and they animate with the buttons, so "circular" needs a radius.
  circularRadius: 'calc(var(--_height) / 2)',
  vars: {
    height: 'container.height',
    'between-space': 'between-space',
    inner: 'inner-corner.corner-size',
    // A plain connected group does not change its corners on hover; a split button does.
    'hover-inner': 'inner-corner.corner-size',
    'pressed-inner': 'pressed.inner-corner.corner-size',
    outer: 'container.shape',
  },
});

export default {
  name: 'ButtonGroup',
  blocks: [...sizes.map(standard), ...sizes.map(connected)],
} satisfies ComponentTokenSpec;
