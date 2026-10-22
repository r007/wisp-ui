'use client';

import type { ComponentPropsWithRef, ReactNode, Ref } from 'react';
import { cx } from '../foundation/cx.js';
import focusRing from '../foundation/focus-ring.module.css';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import styles from './fab.module.css';
import tokens from './fab.tokens.generated.module.css';

export type FabVariant =
  | 'primary-container'
  | 'secondary-container'
  | 'tertiary-container'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'surface';
export type FabSize = 'small' | 'default' | 'medium' | 'large';

interface FabOwnProps {
  /** The colour set. @default 'primary-container' */
  variant?: FabVariant;
  /**
   * 40, 56, 80 or 96px. An extended FAB has no `small` size, so it uses `default`.
   * @default 'default'
   */
  size?: FabSize;
  /** A `surface` FAB sitting closer to the page: a lower shadow and container. */
  lowered?: boolean;
  /** The icon. Decorative: the label, or `aria-label`, names the button. */
  icon: ReactNode;
  /**
   * With a label (`children`), folds the label away so only the icon remains, as an
   * extended FAB does while a page scrolls. Keep `aria-label` set for when it is folded.
   */
  collapsed?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
  /** The label. Without one this is an icon-only FAB, which needs `aria-label`. */
  children?: ReactNode;
}

type FabButtonProps = Omit<ComponentPropsWithRef<'button'>, keyof FabOwnProps | 'href'> & {
  href?: undefined;
};
type FabAnchorProps = Omit<ComponentPropsWithRef<'a'>, keyof FabOwnProps> & { href: string };

export type FabProps = FabOwnProps & (FabButtonProps | FabAnchorProps);

/**
 * A floating action button: the one primary action of a screen. With a label it is an
 * extended FAB.
 *
 * ```tsx
 * <Fab aria-label="Compose" icon={<EditIcon />} />
 * <Fab icon={<EditIcon />}>Compose</Fab>
 * ```
 */
export function Fab(props: FabProps) {
  const {
    variant = 'primary-container',
    size = 'default',
    lowered = false,
    icon,
    collapsed = false,
    render,
    children,
    className,
    onClick,
    ref,
    href,
    type,
    ...rest
  } = props as FabOwnProps & FabAnchorProps & ComponentPropsWithRef<'button'>;

  const extended = children !== undefined && children !== null && children !== false;
  const pressable = usePressable({
    href,
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });

  return renderElement(
    pressable.tag,
    {
      ...rest,
      ...pressable.props,
      className: cx(
        styles.root,
        focusRing.focusRing,
        tokens.root,
        tokens[variant],
        variant === 'surface' && lowered && tokens.lowered,
        extended
          ? tokens[`extended-${size === 'small' ? 'default' : size}`]
          : tokens[`size-${size}`],
        className,
      ),
      'data-variant': variant,
      'data-size': size,
      'data-extended': extended ? '' : undefined,
      'data-collapsed': extended && collapsed ? '' : undefined,
      children: (
        <>
          <StateLayer ref={pressable.surfaceRef} />
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
          {extended ? (
            <span className={styles.label}>
              <span>{children}</span>
            </span>
          ) : null}
        </>
      ),
    },
    render,
  );
}
