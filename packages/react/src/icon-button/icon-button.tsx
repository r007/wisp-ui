'use client';

import type { ComponentPropsWithRef, ReactNode, Ref } from 'react';
import { cx } from '../foundation/cx.js';
import focusRing from '../foundation/focus-ring.module.css';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import styles from './icon-button.module.css';
import tokens from './icon-button.tokens.generated.module.css';

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined';
export type IconButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type IconButtonWidth = 'narrow' | 'default' | 'wide';
export type IconButtonShape = 'round' | 'square';

interface IconButtonOwnProps {
  /** @default 'standard' */
  variant?: IconButtonVariant;
  /** @default 'small' */
  size?: IconButtonSize;
  /** Horizontal padding around the icon. @default 'default' */
  width?: IconButtonWidth;
  /** @default 'round' */
  shape?: IconButtonShape;
  /**
   * Makes this a toggle button. Controlled when defined; a selected toggle
   * morphs its shape, in the expressive style.
   */
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Shown instead of `children` while selected, e.g. a filled variant of the icon. */
  selectedIcon?: ReactNode;
  /** An icon-only control has no text, so it must be named. */
  'aria-label': string;
  disabled?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
  /** The icon. */
  children?: ReactNode;
}

type ButtonElementProps = Omit<
  ComponentPropsWithRef<'button'>,
  keyof IconButtonOwnProps | 'href'
> & { href?: undefined };
type AnchorElementProps = Omit<ComponentPropsWithRef<'a'>, keyof IconButtonOwnProps> & {
  href: string;
};

export type IconButtonProps = IconButtonOwnProps & (ButtonElementProps | AnchorElementProps);

/**
 * A button that is only an icon, for a compact action such as "more" or "favourite". It needs an
 * `aria-label`, since there is no text to name it. There are four variants and five sizes; as a
 * toggle it can swap to a `selectedIcon` and morphs its shape as it is selected.
 *
 * ```tsx
 * <IconButton aria-label="Favourite" variant="tonal">
 *   <FavoriteIcon />
 * </IconButton>
 * ```
 */
export function IconButton(props: IconButtonProps) {
  const {
    variant = 'standard',
    size = 'small',
    width = 'default',
    shape = 'round',
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    selectedIcon,
    disabled,
    render,
    children,
    className,
    onClick,
    ref,
    href,
    type,
    ...rest
  } = props as IconButtonOwnProps & AnchorElementProps & ComponentPropsWithRef<'button'>;

  const pressable = usePressable({
    href,
    disabled,
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    // Handlers are typed per element (button/anchor); the hook only needs the event.
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });
  const { isToggle, selected } = pressable;

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
        tokens[`size-${size}`],
        isToggle && (selected ? tokens.selected : tokens.unselected),
        className,
      ),
      'data-variant': variant,
      'data-size': size,
      'data-width': width,
      'data-shape': shape,
      'data-selected': isToggle && selected ? '' : undefined,
      children: (
        <>
          <StateLayer ref={pressable.surfaceRef} />
          <span className={styles.icon} aria-hidden="true">
            {isToggle && selected && selectedIcon ? selectedIcon : children}
          </span>
        </>
      ),
    },
    render,
  );
}
