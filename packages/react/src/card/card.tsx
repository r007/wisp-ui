'use client';

import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  MouseEventHandler,
  ReactNode,
  Ref,
} from 'react';
import { cx } from '../foundation/cx.js';
import focusRing from '../foundation/focus-ring.module.css';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { usePressable } from '../foundation/use-pressable.js';
import styles from './card.module.css';
import tokens from './card.tokens.generated.module.css';

export type CardVariant = 'elevated' | 'filled' | 'outlined';

interface CardOwnProps {
  /** @default 'elevated' */
  variant?: CardVariant;
  /** Only for clickable cards (`onClick` or `href`). */
  disabled?: boolean;
  /** The card is being dragged: it lifts and takes a stronger state layer. */
  dragged?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
  children?: ReactNode;
}

type CardElementProps = Omit<ComponentPropsWithRef<'div'>, keyof CardOwnProps | 'onClick' | 'ref'> &
  Pick<
    ComponentPropsWithoutRef<'a'>,
    'download' | 'hrefLang' | 'ping' | 'referrerPolicy' | 'rel' | 'target'
  > & {
    ref?: Ref<HTMLElement>;
    /** Makes the card a button (or, with `href`, a link). */
    onClick?: MouseEventHandler<HTMLElement>;
    /** Makes the card a link. */
    href?: string;
    /** Button type, when `onClick` makes it a button. @default 'button' */
    type?: 'button' | 'submit' | 'reset';
  };

export type CardProps = CardOwnProps & CardElementProps;

/**
 * A card: a surface that groups related content.
 *
 * Without `onClick` or `href` it is a plain `<div>`. With one it becomes a button or
 * link covering the whole card, with hover, focus and press states. A `<button>`
 * may only contain phrasing content, so for a clickable card with headings or
 * blocks use `href` or `render`.
 *
 * ```tsx
 * <Card variant="outlined" href="/albums/1">
 *   <img alt="" src="…" />
 *   <h3>Blue train</h3>
 * </Card>
 * ```
 */
export function Card(props: CardProps) {
  const {
    variant = 'elevated',
    disabled,
    dragged,
    render,
    children,
    className,
    onClick,
    ref,
    href,
    type,
    ...rest
  } = props;

  const interactive = href !== undefined || onClick !== undefined;
  const pressable = usePressable({
    href,
    disabled: interactive && disabled,
    onClick,
    ref,
    type,
  });

  const classes = cx(styles.root, interactive && focusRing.focusRing, tokens[variant], className);
  const content = (
    <>
      {interactive || dragged ? <StateLayer ref={pressable.surfaceRef} /> : null}
      {children}
    </>
  );
  const data = {
    'data-variant': variant,
    'data-interactive': interactive ? '' : undefined,
    'data-dragged': dragged ? '' : undefined,
  };

  return interactive
    ? renderElement(
        pressable.tag,
        { ...rest, ...pressable.props, ...data, className: classes, children: content },
        render,
      )
    : renderElement(
        'div',
        {
          ...rest,
          ...data,
          ref: ref as Ref<never> | undefined,
          className: classes,
          children: content,
        },
        render,
      );
}
