import {
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react';

const ITEMS = '[role^="menuitem"]:not([aria-disabled="true"]):not(:disabled)';
const TYPEAHEAD_MS = 600;

export interface MenuNavigationOptions {
  /** Whether the menu is shown. Focus moves to an item each time this becomes true. */
  open: boolean;
  /** Opens the menu, from the trigger's arrow keys. */
  setOpen: (open: boolean) => void;
  /**
   * Closes the menu: `select` when an item was chosen, `outside` when Tab moves focus on (the
   * menu is not part of the tab order, so focus is not returned to the trigger).
   */
  close: (reason: 'select' | 'outside') => void;
  /** The element holding the `menuitem`s. */
  panelRef: RefObject<HTMLElement | null>;
  /** Which item takes focus when the menu opens other than by an arrow key. @default 'first' */
  entry?: 'first' | 'last';
}

/**
 * The keyboard behaviour of the WAI-ARIA menu button pattern, for a menu panel (`role="menu"`)
 * whose items are `role="menuitem"` (or checkbox/radio) elements:
 *
 * - focus goes to an item when it opens;
 * - ArrowDown and ArrowUp, Home and End move between the items, wrapping;
 * - typing letters moves to the next item whose text starts with them;
 * - Tab closes it; choosing an item closes it (unless the item has `data-keep-open`).
 *
 * Spread `onKeyDown` and `onClick` on the panel, and `onTriggerKeyDown` on the element that opens
 * it, where ArrowDown and ArrowUp open it onto the first or the last item.
 */
export function useMenuNavigation({
  open,
  setOpen,
  close,
  panelRef,
  entry: defaultEntry = 'first',
}: MenuNavigationOptions) {
  /** Where focus goes when it opens: set by an arrow key on the trigger, then used once. */
  const entry = useRef<'first' | 'last' | undefined>(undefined);
  const search = useRef({
    text: '',
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  const items = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? []),
    [panelRef],
  );

  useEffect(() => {
    if (!open) return;
    const all = items();
    ((entry.current ?? defaultEntry) === 'last' ? all.at(-1) : all[0])?.focus();
    entry.current = undefined;
  }, [open, items, defaultEntry]);
  useEffect(() => () => clearTimeout(search.current.timer), []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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

  const onClick = (event: MouseEvent<HTMLElement>) => {
    const item = (event.target as Element).closest<HTMLElement>('[role^="menuitem"]');
    if (!item || !panelRef.current?.contains(item)) return;
    if (item.hasAttribute('data-keep-open') || item.matches('[aria-disabled="true"], :disabled'))
      return;
    close('select');
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    entry.current = event.key === 'ArrowUp' ? 'last' : 'first';
    setOpen(true);
  };

  return { onKeyDown, onClick, onTriggerKeyDown };
}
