import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../foundation/cx.js';
import styles from './banner.module.css';
import tokens from './banner.tokens.generated.module.css';

export interface BannerProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  /** The message. Keep it to a sentence or two. */
  children: ReactNode;
  /** A 40px leading icon or image, in a circle. Decorative. */
  icon?: ReactNode;
  /** One or two text `Button`s, such as "Dismiss" and "Learn more". */
  actions?: ReactNode;
  /**
   * Whether the banner is shown. A closed banner folds away and is removed from the accessibility
   * tree, so it can animate out. @default true
   */
  open?: boolean;
}

/**
 * A banner: a message that stays at the top of the content until the user acts on it, with up to
 * two actions. For a brief message that goes by itself, use a snackbar.
 *
 * ```tsx
 * <Banner actions={<Button variant="text">Dismiss</Button>}>
 *   You are offline. Changes will sync when you reconnect.
 * </Banner>
 * ```
 */
export function Banner({ children, icon, actions, open = true, className, ...rest }: BannerProps) {
  return (
    <div
      {...rest}
      role="status"
      className={cx(styles.root, tokens.root, className)}
      data-closed={open ? undefined : ''}
      aria-hidden={open ? undefined : true}
      // A closed banner takes no part in the tab order either.
      inert={open ? undefined : true}
    >
      <div className={styles.clip}>
        <div className={styles.inner}>
          {icon ? (
            <span className={styles.image} aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <p className={styles.text}>{children}</p>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
