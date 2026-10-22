'use client';

import {
  type ComponentPropsWithRef,
  cloneElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
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
  /** `MenuItem`s and `MenuDivider`s. */
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

const ITEMS = '[role^="menuitem"]:not([aria-disabled="true"]):not(:disabled)';
const TYPEAHEAD_MS = 600;

/**
 * A Material menu: a list of actions in a popup opened by a trigger. It follows the WAI-ARIA
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
  /** Where focus goes when it opens: the first item, or the last for ArrowUp. */
  const entry = useRef<'first' | 'last'>('first');
  const search = useRef({
    text: '',
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });

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

  const items = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? []),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const all = items();
    (entry.current === 'last' ? all.at(-1) : all[0])?.focus();
    entry.current = 'first';
  }, [open, items]);
  useEffect(() => () => clearTimeout(search.current.timer), []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowDown') next = all[(index + 1) % all.length];
    else if (event.key === 'ArrowUp') next = all[(index - 1 + all.length) % all.length];
    else if (event.key === 'Home') next = all[0];
    else if (event.key === 'End') next = all.at(-1);
    else if (event.key === 'Tab') {
      // Let focus move on, and close: a menu is not part of the tab order.
      close('outside');
      return;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Typeahead: letters typed in quick succession match the start of an item's text.
      const state = search.current;
      clearTimeout(state.timer);
      state.text += event.key.toLowerCase();
      state.timer = setTimeout(() => {
        state.text = '';
      }, TYPEAHEAD_MS);
      // The same letter again and again is "next item starting with it", not a long prefix.
      const query = [...state.text].every((letter) => letter === state.text[0])
        ? (state.text[0] ?? '')
        : state.text;
      const matches = (item: HTMLElement) =>
        (item.textContent ?? '').trim().toLowerCase().startsWith(query);
      // One repeated letter cycles through the items that start with it.
      const after = [...all.slice(index + 1), ...all.slice(0, index + 1)];
      next = after.find(matches);
    } else return;
    event.preventDefault();
    next?.focus();
  };

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const item = (event.target as Element).closest<HTMLElement>('[role^="menuitem"]');
    if (!item || !panelRef.current?.contains(item)) return;
    if (item.hasAttribute('data-keep-open') || item.matches('[aria-disabled="true"], :disabled'))
      return;
    close('select');
  };

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
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      entry.current = event.key === 'ArrowUp' ? 'last' : 'first';
      setOpen(true);
    },
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
        onKeyDown={onKeyDown}
        onClick={onClick}
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

/** A thin rule between groups of items. */
export function MenuDivider({ className, ...rest }: ComponentPropsWithRef<'hr'>) {
  return <hr {...rest} className={cx(styles.divider, className)} />;
}
