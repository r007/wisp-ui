'use client';

import {
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
} from 'react';
import { cx } from '../foundation/cx.js';
import styles from './app-bar.module.css';
import tokens from './app-bar.tokens.generated.module.css';

export type TopAppBarVariant = 'small' | 'medium' | 'large';

export interface TopAppBarProps extends Omit<ComponentPropsWithRef<'header'>, 'title'> {
  /** The page title. It is the page's `<h1>`. */
  title: ReactNode;
  /** A line under the title. */
  subtitle?: ReactNode;
  /**
   * `small` is a 64px row. `medium` and `large` add a larger title under it, and fold it into the
   * row when collapsed.
   * @default 'small'
   */
  variant?: TopAppBarVariant;
  /** Leading control, usually a menu or back `IconButton`. */
  navigation?: ReactNode;
  /** Trailing controls, usually `IconButton`s. */
  actions?: ReactNode;
  /**
   * Content has scrolled under the bar, so it lifts onto a tinted surface. Leave it out to follow
   * `scrollTarget` instead.
   */
  scrolled?: boolean;
  /** The scrolling element to watch, or `'window'`, when `scrolled` is not set. */
  scrollTarget?: RefObject<HTMLElement | null> | 'window';
  /**
   * Medium and large bars: fold the big title into the row. Defaults to whether the bar is
   * scrolled.
   */
  collapsed?: boolean;
  /** Stick to the top of its scroll container. */
  sticky?: boolean;
}

/** Whether `target` (or the window) has been scrolled down from its top. */
function useScrolled(target: TopAppBarProps['scrollTarget']): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!target) return;
    const element = target === 'window' ? window : target.current;
    if (!element) return;
    const read = () =>
      setScrolled((target === 'window' ? window.scrollY : (target.current?.scrollTop ?? 0)) > 0);
    read();
    element.addEventListener('scroll', read, { passive: true });
    return () => element.removeEventListener('scroll', read);
  }, [target]);
  return scrolled;
}

/**
 * The Material 3 Expressive top app bar: navigation, a title and actions at the top of a screen.
 *
 * ```tsx
 * <TopAppBar
 *   title="Inbox"
 *   navigation={<IconButton aria-label="Menu"><MenuIcon /></IconButton>}
 *   actions={<IconButton aria-label="Search"><SearchIcon /></IconButton>}
 * />
 * ```
 */
export function TopAppBar({
  title,
  subtitle,
  variant = 'small',
  navigation,
  actions,
  scrolled: scrolledProp,
  scrollTarget,
  collapsed: collapsedProp,
  sticky = false,
  className,
  ...rest
}: TopAppBarProps) {
  const watched = useScrolled(scrolledProp === undefined ? scrollTarget : undefined);
  const scrolled = scrolledProp ?? watched;
  const big = variant !== 'small';
  const collapsed = big && (collapsedProp ?? scrolled);
  const hasSubtitle = subtitle !== undefined && subtitle !== null && subtitle !== false;

  const heading = (visible: boolean, key: string) => (
    <div key={key} aria-hidden={visible ? undefined : true}>
      <h1 className={styles.title}>{title}</h1>
      {hasSubtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
    </div>
  );

  return (
    <header
      {...rest}
      className={cx(styles.root, tokens.root, big && tokens[variant], className)}
      data-variant={variant}
      data-scrolled={scrolled ? '' : undefined}
      data-collapsed={collapsed ? '' : undefined}
      data-subtitle={hasSubtitle ? '' : undefined}
      data-sticky={sticky ? '' : undefined}
    >
      <div className={styles.row}>
        {navigation ? <div className={styles.navigation}>{navigation}</div> : null}
        <div className={styles.rowTitle}>{heading(!big || collapsed, 'row')}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {big ? (
        <div className={styles.expanded}>
          <div className={styles.expandedInner}>
            <div className={styles.expandedBody}>{heading(!collapsed, 'big')}</div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
