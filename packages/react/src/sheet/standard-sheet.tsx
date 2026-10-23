'use client';

import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { IconButton } from '../icon-button/icon-button.js';
import type { SheetSide } from './sheet.js';
import tokens from './sheet.tokens.generated.module.css';
import styles from './standard-sheet.module.css';
import { useSheetHandle } from './use-sheet-handle.js';

export interface StandardSheetProps
  extends Omit<ComponentPropsWithRef<'aside'>, 'title' | 'children'> {
  /** Whether the sheet is shown. A closed sheet takes no room and is inert. */
  open: boolean;
  /** Called when the user dismisses it: the close button, the handle, a downward drag, Escape. */
  onOpenChange?: (open: boolean) => void;
  /** The edge it sits at. @default 'end' */
  side?: SheetSide;
  /** The title. Names the sheet; without one, pass `aria-label`. */
  headline?: ReactNode;
  /** Buttons at the bottom of the sheet. */
  actions?: ReactNode;
  /** Side only: a close button in the header. @default true */
  closeButton?: boolean;
  /** Accessible name of the close button. @default 'Close' */
  closeLabel?: string;
  /** Bottom only: a drag handle that also closes the sheet on a press or a downward drag. @default true */
  dragHandle?: boolean;
  /** Accessible name of the handle. @default 'Close sheet' */
  dragHandleLabel?: string;
  /** Side only: how wide it is when open, in pixels, from 256 up. @default 400 */
  width?: number;
  children?: ReactNode;
}

const CloseGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
  </svg>
);

/**
 * A standard (non-modal) sheet: secondary content that sits beside the main content rather than
 * over it. It is a part of the page's layout (a `complementary` landmark), so there is no scrim,
 * no focus trap and the page stays usable; the sheet grows into the space it is given when it
 * opens and gives it back when it closes. Place it in a flex or grid layout (a bottom sheet at
 * the end of a column, a side sheet beside the content) and set a height on it to limit it.
 *
 * It stays controlled, so the parent decides. When it closes with focus inside it, focus goes
 * back to what had it when the sheet opened:
 *
 * ```tsx
 * <StandardSheet open={open} onOpenChange={setOpen} headline="Filters">
 *   …
 * </StandardSheet>
 * ```
 *
 * Use `Sheet` for a modal sheet, which covers the page.
 */
export function StandardSheet({
  open,
  onOpenChange,
  side = 'end',
  headline,
  actions,
  closeButton = true,
  closeLabel = 'Close',
  dragHandle = true,
  dragHandleLabel = 'Close sheet',
  width = 400,
  children,
  className,
  style,
  ref,
  onKeyDown,
  onFocus,
  onBlur,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: StandardSheetProps) {
  const headlineId = useId();
  const root = useRef<HTMLElement | null>(null);
  const mergedRef = useMergedRef(root, ref);
  const bottom = side === 'bottom';
  const hasHeadline = headline !== undefined && headline !== null && headline !== false;
  const handleProps = useSheetHandle(root, () => onOpenChange?.(false));

  // The sheet is not modal, so focus is only taken back when the sheet itself is what had it.
  /** Whether focus is in the sheet, kept as a ref because an inert sheet drops it. */
  const hasFocus = useRef(false);
  /** What had focus when the sheet opened, which is where it returns to. */
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && !root.current?.contains(active)) opener.current = active;
      return;
    }
    // Closed: an inert sheet cannot hold focus, which would otherwise be lost to the page.
    if (hasFocus.current) {
      hasFocus.current = false;
      if (opener.current?.isConnected) opener.current.focus();
    }
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== 'Escape' || !open) return;
    // Escape belongs to an open dialog, menu or tooltip inside the sheet before it does.
    const target = event.target as Element;
    if (target.closest('dialog[open], [popover]:popover-open')) return;
    event.preventDefault();
    onOpenChange?.(false);
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Escape and focus are heard as they bubble up from the controls inside, which are what the user operates.
    <aside
      {...rest}
      ref={mergedRef}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (hasHeadline && !ariaLabel ? headlineId : undefined)}
      className={cx(styles.root, tokens[bottom ? 'standardBottom' : 'standardSide'], className)}
      style={{ ...style, '--_width': `${Math.max(width, 256)}px` } as CSSProperties}
      data-side={side}
      data-open={open ? '' : undefined}
      inert={!open}
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        onFocus?.(event);
        hasFocus.current = true;
      }}
      onBlur={(event) => {
        onBlur?.(event);
        // Focus moving somewhere else counts; focus lost to the page (a closing sheet) does not.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) {
          hasFocus.current = false;
        }
      }}
    >
      <div className={styles.surface}>
        {bottom && dragHandle ? (
          <button
            type="button"
            className={styles.handle}
            aria-label={dragHandleLabel}
            {...handleProps}
          />
        ) : null}
        {hasHeadline || (!bottom && closeButton) ? (
          <div className={styles.header}>
            {hasHeadline ? (
              <h2 id={headlineId} className={styles.headline}>
                {headline}
              </h2>
            ) : (
              <span className={styles.headline} />
            )}
            {!bottom && closeButton ? (
              <IconButton
                variant="standard"
                aria-label={closeLabel}
                onClick={() => onOpenChange?.(false)}
              >
                <CloseGlyph />
              </IconButton>
            ) : null}
          </div>
        ) : null}
        <div className={styles.body}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </aside>
  );
}
