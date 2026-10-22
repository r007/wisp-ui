import type { ComponentPropsWithRef } from 'react';
import { cx } from '../foundation/cx.js';
import styles from './badge.module.css';
import tokens from './badge.tokens.generated.module.css';

export interface BadgeProps extends ComponentPropsWithRef<'span'> {}

/**
 * A status indicator. With no children it is a small dot; with a short label
 * (typically one to four characters, like a count) it is a pill.
 *
 * A dot carries no text, so give it a text alternative where it matters, for
 * example with a visually hidden label inside the element it decorates.
 */
export function Badge({ children, className, ...rest }: BadgeProps) {
  const hasLabel =
    children !== undefined && children !== null && children !== false && children !== '';
  return (
    <span
      {...rest}
      className={cx(styles.root, tokens.root, hasLabel ? styles.large : styles.small, className)}
    >
      {hasLabel ? children : null}
    </span>
  );
}
