'use client';

import {
  type ComponentPropsWithRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useId,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { useModalDialog } from '../foundation/use-modal-dialog.js';
import styles from './sheet.module.css';
import tokens from './sheet.tokens.generated.module.css';
import { useSheetHandle } from './use-sheet-handle.js';

export type SheetSide = 'bottom' | 'start' | 'end';

export interface SheetProps
  extends Omit<
    ComponentPropsWithRef<'dialog'>,
    'open' | 'onCancel' | 'onClose' | 'children' | 'role' | 'title'
  > {
  /** Whether the sheet is shown. */
  open: boolean;
  /** Called when the user dismisses it (Escape, scrim, the handle, a downward drag). */
  onOpenChange?: (open: boolean) => void;
  /** The edge it slides in from. @default 'bottom' */
  side?: SheetSide;
  /** Bottom only: detached from the edge, with a margin and fully rounded corners. */
  floating?: boolean;
  /** The title. Names the sheet; without one, pass `aria-label`. */
  headline?: ReactNode;
  /** Buttons at the bottom of the sheet. */
  actions?: ReactNode;
  /** Bottom only: a drag handle that also closes the sheet on a press or a downward drag. @default true */
  dragHandle?: boolean;
  /** Accessible name of the handle. @default 'Close sheet' */
  dragHandleLabel?: string;
  children?: ReactNode;
}

/**
 * A modal sheet on the native `<dialog>`: a bottom sheet for secondary content on a compact
 * screen, or a side sheet. Focus is trapped, the page behind is inert, and Escape asks to close.
 * It stays controlled, so the parent decides:
 *
 * ```tsx
 * <Sheet open={open} onOpenChange={setOpen} headline="Share">
 *   …
 * </Sheet>
 * ```
 */
export function Sheet({
  open,
  onOpenChange,
  side = 'bottom',
  floating = false,
  headline,
  actions,
  dragHandle = true,
  dragHandleLabel = 'Close sheet',
  children,
  className,
  ref,
  onClick,
  onPointerDown,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: SheetProps) {
  const headlineId = useId();
  const modal = useModalDialog({ open, onOpenChange });
  const mergedRef = useMergedRef(modal.ref, ref);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const bottom = side === 'bottom';
  const hasHeadline = headline !== undefined && headline !== null && headline !== false;

  const handleProps = useSheetHandle(dialog, () => onOpenChange?.(false));

  const setDialog = (node: HTMLDialogElement | null) => {
    dialog.current = node;
    (mergedRef as (node: HTMLDialogElement | null) => void)(node);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a scrim click is a pointer shortcut for dismissing; the keyboard equivalent is Escape, handled by onCancel.
    <dialog
      {...rest}
      {...modal.props}
      ref={setDialog}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (hasHeadline && !ariaLabel ? headlineId : undefined)}
      className={cx(
        styles.root,
        tokens[bottom ? (floating ? 'floating' : 'bottom') : 'side'],
        // A floating sheet still needs the handle's tokens.
        bottom && floating && tokens.bottom,
        className,
      )}
      data-side={side}
      data-floating={bottom && floating ? '' : undefined}
      onPointerDown={(event: PointerEvent<HTMLDialogElement>) => {
        onPointerDown?.(event);
        modal.props.onPointerDown(event);
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        onClick?.(event);
        modal.props.onClick(event);
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
        {hasHeadline ? (
          <div className={styles.header}>
            <h2 id={headlineId} className={styles.headline}>
              {headline}
            </h2>
          </div>
        ) : null}
        <div className={styles.body}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </dialog>
  );
}
