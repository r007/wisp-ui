'use client';

import type { ComponentPropsWithRef, ReactNode, Ref } from 'react';
import { cx } from '../foundation/cx.js';
import focusRing from '../foundation/focus-ring.module.css';
import { type RenderProp, type RootProps, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import styles from './list.module.css';
import tokens from './list.tokens.generated.module.css';

export interface ListProps extends ComponentPropsWithRef<'ul'> {
  /**
   * Expressive: items are separate segments, 2px apart, whose corners open up on hover and
   * round off on focus and press.
   */
  segmented?: boolean;
}

/**
 * A Material list: items stacked in a `<ul>`. Name a list that is a landmark or a widget
 * with `aria-label`; use `role` for patterns such as `listbox`.
 *
 * ```tsx
 * <List aria-label="Inbox">
 *   <ListItem headline="Brunch this weekend?" supportingText="I'll be in your neighbourhood" />
 * </List>
 * ```
 */
export function List({ segmented = false, className, ...rest }: ListProps) {
  return (
    <ul
      {...rest}
      className={cx(styles.root, tokens.root, className)}
      data-segmented={segmented ? '' : undefined}
    />
  );
}

export type ListItemLeadingKind = 'icon' | 'avatar' | 'image' | 'video';
export type ListItemTrailingKind = 'icon' | 'text';

interface ListItemOwnProps {
  /** The item's main text. */
  headline: ReactNode;
  /** A short line above the headline. */
  overline?: ReactNode;
  /** One or two lines below the headline. */
  supportingText?: ReactNode;
  /** An icon, avatar, image or video before the text. Decorative: the text names the item. */
  leading?: ReactNode;
  /** What `leading` is, which sizes it. @default 'icon' */
  leadingKind?: ListItemLeadingKind;
  /** An icon or short text after the text. */
  trailing?: ReactNode;
  /** What `trailing` is. @default 'icon' */
  trailingKind?: ListItemTrailingKind;
  /**
   * Shows the item as the current one: a tinted container. Sets `aria-current`, or
   * `aria-selected` when you give the item a `role` such as `option`.
   */
  selected?: boolean;
  /** For links, `aria-disabled` is set and `href` removed. */
  disabled?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
}

type ListItemStaticProps = Omit<
  ComponentPropsWithRef<'div'>,
  keyof ListItemOwnProps | 'onClick'
> & {
  href?: undefined;
  onClick?: undefined;
};
type ListItemButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  keyof ListItemOwnProps | 'href'
> & { href?: undefined };
type ListItemAnchorProps = Omit<ComponentPropsWithRef<'a'>, keyof ListItemOwnProps> & {
  href: string;
};

export type ListItemProps = ListItemOwnProps &
  (ListItemStaticProps | ListItemButtonProps | ListItemAnchorProps);

const SELECTION_ROLES = new Set(['option', 'tab', 'row', 'gridcell', 'treeitem']);

/**
 * One row of a `List`. Without `onClick` or `href` it is plain content; with one it is a
 * button or link covering the whole row, with hover, focus and press states.
 */
export function ListItem(props: ListItemProps) {
  const {
    headline,
    overline,
    supportingText,
    leading,
    leadingKind = 'icon',
    trailing,
    trailingKind = 'icon',
    selected = false,
    disabled = false,
    render,
    className,
    onClick,
    ref,
    href,
    type,
    role,
    ...rest
  } = props as ListItemOwnProps &
    ListItemAnchorProps &
    ComponentPropsWithRef<'button'> & { role?: string };

  const interactive = href !== undefined || onClick !== undefined;
  const pressable = usePressable({
    href,
    disabled: interactive && disabled,
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });

  const lines = 1 + (overline ? 1 : 0) + (supportingText ? 1 : 0);
  const selectionAttribute =
    role && SELECTION_ROLES.has(role)
      ? { 'aria-selected': selected }
      : selected
        ? { 'aria-current': true }
        : {};

  const content = (
    <>
      {interactive ? <StateLayer ref={pressable.surfaceRef} /> : null}
      {leading ? (
        <span className={styles.leading} data-kind={leadingKind} aria-hidden="true">
          {leading}
        </span>
      ) : null}
      <span className={styles.text}>
        {overline ? <span className={styles.overline}>{overline}</span> : null}
        <span className={styles.headline}>{headline}</span>
        {supportingText ? <span className={styles.supporting}>{supportingText}</span> : null}
      </span>
      {trailing ? (
        <span
          className={styles.trailing}
          data-kind={trailingKind}
          aria-hidden={trailingKind === 'icon' || undefined}
        >
          {trailing}
        </span>
      ) : null}
    </>
  );

  const itemProps: RootProps = {
    ...rest,
    ...(interactive ? pressable.props : { ref: ref as Ref<never> | undefined }),
    ...selectionAttribute,
    role,
    className: cx(styles.item, interactive && focusRing.focusRing, className),
    'data-lines': lines,
    'data-selected': selected ? '' : undefined,
    'data-interactive': interactive ? '' : undefined,
    'data-disabled': disabled ? '' : undefined,
    children: content,
  };

  return (
    <li className={styles.row}>
      {renderElement(interactive ? pressable.tag : 'div', itemProps, render)}
    </li>
  );
}

/**
 * A thin rule between groups of items. A `<ul>` may only contain `<li>`s without a role of
 * their own, so the rule is an `<hr>` in a plain `<li>`, hidden from assistive technology so
 * it is not counted as an item. It is purely visual: to group items for screen readers, use
 * separate lists.
 */
export function ListDivider({ className, ...rest }: ComponentPropsWithRef<'hr'>) {
  return (
    <li aria-hidden="true" className={styles.row}>
      <hr {...rest} className={cx(styles.divider, className)} />
    </li>
  );
}
