import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../foundation/cx.js';
import styles from './bottom-app-bar.module.css';
import tokens from './bottom-app-bar.tokens.generated.module.css';

export interface BottomAppBarProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  /** Icon buttons at the start of the bar. Give them `aria-label`s. */
  children?: ReactNode;
  /** A FAB at the end of the bar. */
  fab?: ReactNode;
  /** Stick to the bottom of its scroll container. */
  sticky?: boolean;
  /** Names the bar. */
  'aria-label': string;
}

/**
 * A bottom app bar: a few icon actions and a FAB at the bottom of a compact screen. It is a
 * `role="toolbar"` group; for the arrow-key behaviour of a full toolbar use `Toolbar`.
 *
 * ```tsx
 * <BottomAppBar aria-label="Actions" fab={<Fab aria-label="Add" icon={<AddIcon />} />}>
 *   <IconButton aria-label="Search"><SearchIcon /></IconButton>
 * </BottomAppBar>
 * ```
 */
export function BottomAppBar({
  children,
  fab,
  sticky = false,
  className,
  ...rest
}: BottomAppBarProps) {
  return (
    <div
      {...rest}
      role="toolbar"
      className={cx(styles.root, tokens.root, className)}
      data-sticky={sticky ? '' : undefined}
    >
      <div className={styles.actions}>{children}</div>
      {fab ? <div className={styles.fab}>{fab}</div> : null}
    </div>
  );
}
