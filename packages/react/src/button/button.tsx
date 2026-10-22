'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../foundation/cx.js';
import focusRing from '../foundation/focus-ring.module.css';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import styles from './button.module.css';
import tokens from './button.tokens.generated.module.css';

export type ButtonVariant = 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text';
export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

interface ButtonOwnProps {
  /** @default 'filled' */
  variant?: ButtonVariant;
  /** @default 'small' */
  size?: ButtonSize;
  /** @default 'round' */
  shape?: ButtonShape;
  /**
   * Makes this a toggle button. Controlled when defined; a selected toggle
   * morphs its shape, as Material 3 Expressive specifies. Not available on
   * `text` buttons.
   */
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Leading icon. Decorative; the label names the button. */
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  /**
   * For links, `aria-disabled` is set and `href` removed, so the element is
   * neither focusable nor navigable.
   */
  disabled?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
  children?: ReactNode;
}

type ButtonElementProps = Omit<ComponentPropsWithRef<'button'>, keyof ButtonOwnProps | 'href'> & {
  href?: undefined;
};
type AnchorElementProps = Omit<ComponentPropsWithRef<'a'>, keyof ButtonOwnProps> & { href: string };

export type ButtonProps = ButtonOwnProps & (ButtonElementProps | AnchorElementProps);

export function Button(props: ButtonProps) {
  const {
    variant = 'filled',
    size = 'small',
    shape = 'round',
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    icon,
    trailingIcon,
    disabled = false,
    render,
    children,
    className,
    onClick,
    ref,
    href,
    ...rest
  } = props as ButtonOwnProps & AnchorElementProps & ComponentPropsWithRef<'button'>;

  const isLink = href !== undefined;
  const isToggle = selectedProp !== undefined || defaultSelected !== undefined;
  const [selected, setSelected] = useControllableState({
    value: selectedProp,
    defaultValue: defaultSelected ?? false,
    onChange: onSelectedChange,
  });

  const { controlRef, surfaceRef } = useStateLayer<HTMLElement>({ disabled });
  const mergedRef = useMergedRef(controlRef, ref as never);

  const rootProps = {
    ...rest,
    ref: mergedRef,
    className: cx(
      styles.root,
      focusRing.focusRing,
      tokens.root,
      tokens[variant],
      tokens[`size-${size}`],
      isToggle && (selected ? tokens.selected : tokens.unselected),
      className,
    ),
    'data-variant': variant,
    'data-size': size,
    'data-shape': shape,
    'data-selected': isToggle && selected ? '' : undefined,
    'aria-pressed': isToggle ? selected : undefined,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event as never);
      if (isToggle && !event.defaultPrevented) setSelected(!selected);
    },
    // Links cannot be natively disabled. Without an href an <a> loses its link
    // role, so restore it explicitly (the ARIA pattern for a disabled link).
    ...(isLink
      ? {
          href: disabled ? undefined : href,
          role: disabled ? 'link' : undefined,
          'aria-disabled': disabled || undefined,
          tabIndex: disabled ? -1 : undefined,
        }
      : { type: (rest as { type?: string }).type ?? 'button', disabled }),
    children: (
      <>
        <StateLayer ref={surfaceRef} />
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span>{children}</span>
        {trailingIcon ? (
          <span className={styles.icon} aria-hidden="true">
            {trailingIcon}
          </span>
        ) : null}
      </>
    ),
  };

  return renderElement(isLink ? 'a' : 'button', rootProps, render);
}
