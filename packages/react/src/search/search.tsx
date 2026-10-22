'use client';

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useModalDialog } from '../foundation/use-modal-dialog.js';
import { type PopoverDismissReason, usePopover } from '../foundation/use-popover.js';
import { IconButton } from '../icon-button/icon-button.js';
import { SearchBar } from '../search-bar/search-bar.js';
import styles from './search.module.css';
import tokens from './search.tokens.generated.module.css';

export type SearchVariant = 'docked' | 'full-screen';

export interface SearchProps {
  /**
   * Suggestions and results: usually a `List` of `ListItem`s. Pressing a button or link in
   * here closes the search, unless it has `data-keep-open`.
   */
  children?: ReactNode;
  /** Names the search. */
  'aria-label': string;
  placeholder?: string;
  /** The text. Controlled when defined. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * `docked` opens over the bar and grows downward, for wide screens. `full-screen` opens
   * a modal over the whole page, for compact ones. @default 'docked'
   */
  variant?: SearchVariant;
  /** The bar's icon at the start. A magnifier unless given. */
  leading?: ReactNode;
  /** Actions at the end of the bar and of the open view's header. */
  trailing?: ReactNode;
  /** Called with the text when Enter is pressed; the search then closes. */
  onSearch?: (value: string) => void;
  /** Names the button that closes the open view. @default 'Close search' */
  closeLabel?: string;
  /** Names the button that clears the text. @default 'Clear' */
  clearLabel?: string;
  /** Class for the bar's wrapper. */
  className?: string;
}

/** What the arrow keys move between in the results. */
const RESULT_ITEMS = 'button:not(:disabled), a[href], [role="option"]:not([aria-disabled="true"])';

const BackGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
  </svg>
);
const ClearGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
  </svg>
);

/**
 * A search bar that opens into a view of suggestions or results, docked over the bar or
 * full-screen. The bar opens the view when it is pressed, when the arrow-down key is pressed
 * on it, or when the user types in it. In the view, Escape closes it and returns focus to the
 * bar, Enter searches, and the arrow keys move between the input and the results.
 *
 * ```tsx
 * <Search aria-label="Search recipes" placeholder="Search recipes" onSearch={find}>
 *   <List>
 *     <ListItem headline="Apple pie" onClick={() => open('apple-pie')} />
 *   </List>
 * </Search>
 * ```
 *
 * For a plain bar with no view, use `SearchBar`.
 */
export function Search({
  children,
  'aria-label': ariaLabel,
  placeholder,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  variant = 'docked',
  leading,
  trailing,
  onSearch,
  closeLabel = 'Close search',
  clearLabel = 'Clear',
  className,
}: SearchProps) {
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const barInput = useRef<HTMLInputElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const headerInput = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const ignore = useRef([anchor]).current;
  const docked = variant === 'docked';

  const close = useCallback(
    (reason?: PopoverDismissReason | 'select' | 'search') => {
      setOpen(false);
      // Back to the bar, unless the user pressed somewhere else.
      if (reason !== 'outside') barInput.current?.focus();
    },
    [setOpen],
  );
  const popover = usePopover({
    open: open && docked,
    onOpenChange: (next, reason) => (next ? setOpen(true) : close(reason)),
    ignore,
  });
  const modal = useModalDialog({
    open: open && !docked,
    onOpenChange: (next) => (next ? setOpen(true) : close('escape')),
  });

  // The input of the open view takes the typing.
  useEffect(() => {
    if (open) headerInput.current?.focus();
  }, [open]);

  const items = () =>
    Array.from(results.current?.querySelectorAll<HTMLElement>(RESULT_ITEMS) ?? []);

  const onHeaderKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSearch?.(value);
      close('search');
    } else if (event.key === 'ArrowDown') {
      const first = items()[0];
      if (!first) return;
      event.preventDefault();
      first.focus();
    }
  };
  const onResultsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    let next: HTMLElement | null | undefined;
    if (event.key === 'ArrowDown') next = all[index + 1];
    else if (event.key === 'ArrowUp') next = index === 0 ? headerInput.current : all[index - 1];
    else if (event.key === 'Home') next = all[0];
    else if (event.key === 'End') next = all.at(-1);
    else return;
    event.preventDefault();
    next?.focus();
  };
  const onResultsClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as Element).closest<HTMLElement>('button, a[href]');
    if (!target || !results.current?.contains(target)) return;
    if (target.hasAttribute('data-keep-open') || target.matches(':disabled')) return;
    close('select');
  };

  const view = (
    <>
      <div className={styles.header}>
        <IconButton className={styles.back} aria-label={closeLabel} onClick={() => close('escape')}>
          <BackGlyph />
        </IconButton>
        <input
          ref={headerInput}
          type="search"
          className={styles.input}
          aria-label={ariaLabel}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onHeaderKeyDown}
        />
        <div className={styles.trailing}>
          {value ? (
            <IconButton
              aria-label={clearLabel}
              onClick={() => {
                setValue('');
                headerInput.current?.focus();
              }}
            >
              <ClearGlyph />
            </IconButton>
          ) : null}
          {trailing}
        </div>
      </div>
      {children ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: it only handles keys and presses that bubble up from the buttons and links inside it.
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: as above.
        <div
          ref={results}
          className={styles.results}
          onKeyDown={onResultsKeyDown}
          onClick={onResultsClick}
        >
          {children}
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <div ref={anchor} className={cx(styles.anchor, className)} style={popover.anchorStyle}>
        <SearchBar
          ref={barInput}
          aria-label={ariaLabel}
          placeholder={placeholder}
          leading={leading}
          trailing={trailing}
          value={value}
          onValueChange={(next) => {
            setValue(next);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
            }
          }}
          onSearch={(text) => onSearch?.(text)}
        />
      </div>
      {docked ? (
        // biome-ignore lint/a11y/useSemanticElements: `<search>` is not yet exposed as a landmark by every browser and screen reader, `role="search"` on a `div` is.
        <div
          ref={popover.ref as RefObject<HTMLDivElement>}
          popover="manual"
          role="search"
          aria-label={ariaLabel}
          style={popover.popoverStyle}
          className={cx(styles.view, tokens.root)}
          data-variant="docked"
        >
          {view}
        </div>
      ) : (
        <dialog
          ref={modal.ref}
          {...modal.props}
          aria-label={ariaLabel}
          className={cx(styles.view, tokens.root)}
          data-variant="full-screen"
        >
          {view}
        </dialog>
      )}
    </>
  );
}
