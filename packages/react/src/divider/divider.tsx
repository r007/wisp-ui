import type { ComponentPropsWithRef } from 'react';
import { cx } from '../foundation/cx.js';
import styles from './divider.module.css';
import tokens from './divider.tokens.generated.module.css';

export interface DividerProps extends Omit<ComponentPropsWithRef<'hr'>, 'children'> {
  /** A vertical rule between inline items, e.g. in a toolbar. */
  vertical?: boolean;
  /**
   * Indents the divider by 16px so it lines up with content: from the start, from
   * the end, or from both ("middle"). Not set: edge to edge.
   */
  inset?: 'start' | 'end' | 'both';
}

/**
 * A thin rule that separates content. It renders an `<hr>`, which assistive
 * technology announces as a separator; pass `role="presentation"` when the rule
 * is purely decorative.
 */
export function Divider({ vertical = false, inset, className, ...rest }: DividerProps) {
  return (
    <hr
      aria-orientation={vertical ? 'vertical' : undefined}
      {...rest}
      className={cx(styles.root, tokens.root, className)}
      data-orientation={vertical ? 'vertical' : 'horizontal'}
      data-inset={inset}
    />
  );
}
