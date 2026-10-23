'use client';

import {
  type ComponentPropsWithRef,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useId,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import focusRing from '../foundation/focus-ring.module.css';
import {
  mergeProps,
  type RenderProp,
  type RootProps,
  renderElement,
} from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useMenuNavigation } from '../foundation/use-menu-navigation.js';
import { type PopoverDismissReason, usePopover } from '../foundation/use-popover.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import list from '../list/list.module.css';
import styles from './menu.module.css';
import tokens from './menu.tokens.generated.module.css';

export type MenuScheme = 'standard' | 'vibrant';
export type MenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export interface MenuProps {
  /** The element that opens the menu. It must accept a ref, a style and event handlers. */
  trigger: ReactElement;
  /** `MenuItem`s and `MenuDivider`s, or `MenuGroup`s. */
  children: ReactNode;
  /** `standard` is a low surface with a tertiary selection; `vibrant` a tertiary container. @default 'standard' */
  scheme?: MenuScheme;
  /** Where it opens from; it flips when there is no room. @default 'bottom-start' */
  placement?: MenuPlacement;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Names the menu. Without it the trigger names it. */
  'aria-label'?: string;
  className?: string;
}

/**
 * A menu: a list of actions in a popup opened by a trigger. It follows the WAI-ARIA
 * menu button pattern: Arrow keys, Home, End and typing a letter move between items, Escape
 * closes and returns focus to the trigger, and choosing an item closes the menu.
 *
 * ```tsx
 * <Menu trigger={<Button>Options</Button>}>
 *   <MenuItem leading={<EditIcon />} onClick={edit}>Edit</MenuItem>
 *   <MenuItem leading={<DeleteIcon />} onClick={remove}>Delete</MenuItem>
 * </Menu>
 * ```
 */
export function Menu({
  trigger,
  children,
  scheme = 'standard',
  placement = 'bottom-start',
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  'aria-label': ariaLabel,
  className,
}: MenuProps) {
  const menuId = useId();
  const triggerId = useId();
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const ignore = useRef([triggerRef]).current;

  const close = useCallback(
    (reason?: PopoverDismissReason | 'select') => {
      setOpen(false);
      // Back to the trigger, unless the user pressed somewhere else.
      if (reason !== 'outside') triggerRef.current?.focus();
    },
    [setOpen],
  );
  const popover = usePopover({
    open,
    onOpenChange: (next, reason) => (next ? setOpen(true) : close(reason)),
    ignore,
  });

  const navigation = useMenuNavigation({ open, setOpen, close, panelRef });

  const element = trigger as ReactElement<RootProps>;
  const labelId = (element.props.id as string | undefined) ?? triggerId;
  const own: RootProps = {
    children: element.props.children,
    id: labelId,
    ref: triggerRef as Ref<never>,
    style: popover.anchorStyle,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': menuId,
    onClick: () => setOpen(!open),
    onKeyDown: navigation.onTriggerKeyDown,
  };

  return (
    <>
      {cloneElement(element, mergeProps(own, element.props))}
      <div
        ref={(node) => {
          panelRef.current = node;
          (popover.ref as { current: HTMLElement | null }).current = node;
        }}
        id={menuId}
        popover="manual"
        role="menu"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : labelId}
        style={popover.popoverStyle}
        className={cx(styles.root, tokens.root, tokens[scheme], className)}
        data-placement={placement}
        onKeyDown={navigation.onKeyDown}
        onClick={navigation.onClick}
      >
        {children}
      </div>
    </>
  );
}

interface MenuItemOwnProps {
  /** The item's label. */
  children: ReactNode;
  /** A 20px icon before the label. Decorative. */
  leading?: ReactNode;
  /** An icon or short text after the label, such as a keyboard shortcut. */
  trailing?: ReactNode;
  /** What `trailing` is. @default 'icon' */
  trailingKind?: 'icon' | 'text';
  /**
   * `menuitemcheckbox` and `menuitemradio` are toggles: pass `checked`.
   * @default 'menuitem'
   */
  role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
  /** For a checkbox or radio item; a checked item gets the selected look. */
  checked?: boolean;
  /** Leave the menu open when this item is chosen, e.g. for a checkbox. */
  keepOpen?: boolean;
  disabled?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
}

type MenuItemButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  keyof MenuItemOwnProps | 'href'
> & {
  href?: undefined;
};
type MenuItemAnchorProps = Omit<ComponentPropsWithRef<'a'>, keyof MenuItemOwnProps> & {
  href: string;
};

export type MenuItemProps = MenuItemOwnProps & (MenuItemButtonProps | MenuItemAnchorProps);

/** One action in a `Menu`. A button, or a link with `href`. */
export function MenuItem(props: MenuItemProps) {
  const {
    children,
    leading,
    trailing,
    trailingKind = 'icon',
    role = 'menuitem',
    checked,
    keepOpen = false,
    disabled = false,
    render,
    className,
    onClick,
    ref,
    href,
    type,
    ...rest
  } = props as MenuItemOwnProps & MenuItemAnchorProps & ComponentPropsWithRef<'button'>;

  const pressable = usePressable({
    href,
    disabled,
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });
  const selected = role !== 'menuitem' && checked === true;

  return renderElement(
    pressable.tag,
    {
      ...rest,
      ...pressable.props,
      role,
      tabIndex: -1,
      'aria-checked': role === 'menuitem' ? undefined : (checked ?? false),
      className: cx(list.item, styles.item, focusRing.focusRing, className),
      'data-lines': 1,
      'data-interactive': '',
      'data-selected': selected ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      'data-keep-open': keepOpen ? '' : undefined,
      children: (
        <>
          <StateLayer ref={pressable.surfaceRef} />
          {leading ? (
            <span className={list.leading} data-kind="icon" aria-hidden="true">
              {leading}
            </span>
          ) : null}
          <span className={list.text}>
            <span className={list.headline}>{children}</span>
          </span>
          {trailing ? (
            <span
              className={list.trailing}
              data-kind={trailingKind}
              aria-hidden={trailingKind === 'icon' || undefined}
            >
              {trailing}
            </span>
          ) : null}
        </>
      ),
    },
    render,
  );
}

export interface MenuGroupProps extends ComponentPropsWithRef<'div'> {
  /** The `MenuItem`s of the group. */
  children: ReactNode;
}

/**
 * A group of items that is its own rounded surface, a couple of pixels from the next group:
 * The expressive segmented menu. Put only groups in the `Menu` (a divider is not needed between
 * them). Give each a name with `aria-label` when it has a meaning of its own.
 *
 * ```tsx
 * <Menu trigger={<Button>Edit</Button>}>
 *   <MenuGroup aria-label="Clipboard"><MenuItem>Cut</MenuItem><MenuItem>Copy</MenuItem></MenuGroup>
 *   <MenuGroup aria-label="History"><MenuItem>Undo</MenuItem></MenuGroup>
 * </Menu>
 * ```
 */
export function MenuGroup({ className, children, ...rest }: MenuGroupProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> is a form control group, with a border, padding and a legend that this drawn surface would have to undo; role="group" has the same meaning.
    <div {...rest} role="group" className={cx(styles.group, className)}>
      {children}
    </div>
  );
}

/** A thin rule between groups of items. */
export function MenuDivider({ className, ...rest }: ComponentPropsWithRef<'hr'>) {
  return <hr {...rest} className={cx(styles.divider, className)} />;
}
