'use client';

import {
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
  useCallback,
  useId,
  useRef,
} from 'react';
import { Fab } from '../fab/fab.js';
import { cx } from '../foundation/cx.js';
import focusRing from '../foundation/focus-ring.module.css';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useMenuNavigation } from '../foundation/use-menu-navigation.js';
import { type PopoverDismissReason, usePopover } from '../foundation/use-popover.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import styles from './fab-menu.module.css';
import tokens from './fab-menu.tokens.generated.module.css';

export type FabMenuColor = 'primary' | 'secondary' | 'tertiary';
export type FabMenuSize = 'default' | 'medium' | 'large';

export interface FabMenuProps {
  /** `FabMenuItem`s, top to bottom. The last is nearest the button. */
  children: ReactNode;
  /** The icon on the closed button. Decorative: `aria-label` names the button. */
  icon: ReactNode;
  /** Replaces the cross on the open button. */
  closeIcon?: ReactNode;
  /** Names the button, and so the menu. */
  'aria-label': string;
  /**
   * The colour set. Closed, the button is that colour's `-container` FAB and the items share
   * it; open, the button is the solid colour. @default 'primary'
   */
  color?: FabMenuColor;
  /** The closed button's size: 56, 80 or 96px. Open, it is always 56px. @default 'default' */
  size?: FabMenuSize;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const CloseGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
  </svg>
);

/**
 * A FAB that opens into a menu of related actions, stacked above it. Pressing it turns it into
 * a close button. It follows the WAI-ARIA menu button pattern: Arrow keys, Home, End and typing
 * move between the items, Escape closes and returns focus to the button, and choosing an item
 * closes the menu.
 *
 * ```tsx
 * <FabMenu aria-label="Create" icon={<AddIcon />}>
 *   <FabMenuItem icon={<EditIcon />} onClick={compose}>Compose</FabMenuItem>
 *   <FabMenuItem icon={<ImageIcon />} onClick={upload}>Photo</FabMenuItem>
 * </FabMenu>
 * ```
 */
export function FabMenu({
  children,
  icon,
  closeIcon,
  'aria-label': ariaLabel,
  color = 'primary',
  size = 'default',
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
}: FabMenuProps) {
  const menuId = useId();
  const toggleId = useId();
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const ignore = useRef([toggleRef]).current;

  const close = useCallback(
    (reason?: PopoverDismissReason | 'select') => {
      setOpen(false);
      // Back to the button, unless the user pressed somewhere else.
      if (reason !== 'outside') toggleRef.current?.focus();
    },
    [setOpen],
  );
  const popover = usePopover({
    open,
    onOpenChange: (next, reason) => (next ? setOpen(true) : close(reason)),
    ignore,
  });
  // The items are above the button, so the one nearest it is the last: that is where focus lands.
  const navigation = useMenuNavigation({ open, setOpen, close, panelRef, entry: 'last' });

  return (
    <div
      className={cx(styles.root, tokens.root, tokens[color], className)}
      data-open={open ? '' : undefined}
    >
      <Fab
        ref={toggleRef}
        id={toggleId}
        className={styles.toggle}
        variant={open ? color : `${color}-container`}
        size={open ? 'default' : size}
        icon={open ? (closeIcon ?? <CloseGlyph />) : icon}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        style={popover.anchorStyle}
        onClick={() => setOpen(!open)}
        onKeyDown={navigation.onTriggerKeyDown}
      />
      <div
        ref={(node) => {
          panelRef.current = node;
          (popover.ref as { current: HTMLElement | null }).current = node;
        }}
        id={menuId}
        popover="manual"
        role="menu"
        aria-labelledby={toggleId}
        style={popover.popoverStyle}
        className={styles.panel}
        onKeyDown={navigation.onKeyDown}
        onClick={navigation.onClick}
      >
        {children}
      </div>
    </div>
  );
}

interface FabMenuItemOwnProps {
  /** The item's label. */
  children: ReactNode;
  /** A 24px icon before the label. Decorative. */
  icon?: ReactNode;
  disabled?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
}

type FabMenuItemButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  keyof FabMenuItemOwnProps | 'href'
> & { href?: undefined };
type FabMenuItemAnchorProps = Omit<ComponentPropsWithRef<'a'>, keyof FabMenuItemOwnProps> & {
  href: string;
};

export type FabMenuItemProps = FabMenuItemOwnProps &
  (FabMenuItemButtonProps | FabMenuItemAnchorProps);

/** One action in a `FabMenu`. A button, or a link with `href`. */
export function FabMenuItem(props: FabMenuItemProps) {
  const {
    children,
    icon,
    disabled = false,
    render,
    className,
    onClick,
    ref,
    href,
    type,
    ...rest
  } = props as FabMenuItemOwnProps & FabMenuItemAnchorProps & ComponentPropsWithRef<'button'>;

  const pressable = usePressable({
    href,
    disabled,
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });

  return renderElement(
    pressable.tag,
    {
      ...rest,
      ...pressable.props,
      role: 'menuitem',
      tabIndex: -1,
      className: cx(styles.item, focusRing.focusRing, className),
      'data-disabled': disabled ? '' : undefined,
      children: (
        <>
          <StateLayer ref={pressable.surfaceRef} />
          {icon ? (
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span>{children}</span>
        </>
      ),
    },
    render,
  );
}
