import type { ComponentPropsWithRef } from 'react';
import { cx } from '../foundation/cx.js';
import styles from './chip-group.module.css';

/**
 * Lays chips out in a wrapping row. It renders `role="group"`: name it with
 * `aria-label` or `aria-labelledby` so assistive technology announces what the
 * chips are for.
 */
export function ChipGroup({ className, ...rest }: ComponentPropsWithRef<'div'>) {
  // biome-ignore lint/a11y/useSemanticElements: a <fieldset> brings its own border, padding and min-width, and expects a <legend>; a labelled ARIA group is the right fit for a row of chips.
  return <div role="group" {...rest} className={cx(styles.root, className)} />;
}
