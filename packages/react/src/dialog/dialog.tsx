'use client';

import {
  type ComponentPropsWithRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type UIEvent,
  useId,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { useModalDialog } from '../foundation/use-modal-dialog.js';
import styles from './dialog.module.css';
import tokens from './dialog.tokens.generated.module.css';

export type DialogVariant = 'basic' | 'fullscreen';

export interface DialogProps
  extends Omit<
    ComponentPropsWithRef<'dialog'>,
    'open' | 'onCancel' | 'onClose' | 'children' | 'role'
  > {
  /** Whether the dialog is shown. */
  open: boolean;
  /** Called when the user dismisses it (Escape, scrim, close button). The parent decides. */
  onOpenChange?: (open: boolean) => void;
  /**
   * `basic` floats over a scrim. `fullscreen` fills the window, with a header: use it
   * on compact windows, where a floating dialog would leave no room.
   * @default 'basic'
   */
  variant?: DialogVariant;
  /** The title. It names the dialog; without one, pass `aria-label`. */
  headline?: ReactNode;
  /** Basic only. A decorative icon above the headline; the headline is then centred. */
  icon?: ReactNode;
  /** Full-screen only. Leading control in the header, usually a close `IconButton`. */
  navigation?: ReactNode;
  /** Buttons: at the bottom (basic) or the end of the header (full-screen). */
  actions?: ReactNode;
  /**
   * `alertdialog` for a message that needs an answer, such as confirming a
   * destructive action.
   * @default 'dialog'
   */
  role?: 'dialog' | 'alertdialog';
  /** The supporting text or any content. It describes the dialog. */
  children?: ReactNode;
}

/**
 * A Material dialog, on the native `<dialog>`: focus is trapped, the page behind it
 * is inert, and Escape asks to close. It stays controlled, so the parent decides:
 *
 * ```tsx
 * <Dialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   headline="Discard draft?"
 *   actions={<>
 *     <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
 *     <Button variant="text" onClick={discard}>Discard</Button>
 *   </>}
 * >
 *   Your changes will be lost.
 * </Dialog>
 * ```
 */
export function Dialog({
  open,
  onOpenChange,
  variant = 'basic',
  headline,
  icon,
  navigation,
  actions,
  role = 'dialog',
  children,
  className,
  ref,
  onClick,
  onPointerDown,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: DialogProps) {
  const headlineId = useId();
  const bodyId = useId();
  const modal = useModalDialog({ open, onOpenChange });
  const mergedRef = useMergedRef(modal.ref, ref);
  const fullscreen = variant === 'fullscreen';
  const hasHeadline = headline !== undefined && headline !== null && headline !== false;

  const headlineNode = hasHeadline ? (
    <h2 id={headlineId} className={styles.headline}>
      {headline}
    </h2>
  ) : null;
  const body = children ? (
    <div
      id={bodyId}
      className={styles.body}
      // Full-screen: the header lifts once the content scrolls under it.
      onScroll={
        fullscreen
          ? (event: UIEvent<HTMLDivElement>) =>
              event.currentTarget.parentElement?.toggleAttribute(
                'data-scrolled',
                event.currentTarget.scrollTop > 0,
              )
          : undefined
      }
    >
      {children}
    </div>
  ) : null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a scrim click is a pointer shortcut for dismissing; the keyboard equivalent is Escape, handled by onCancel.
    <dialog
      {...rest}
      {...modal.props}
      ref={mergedRef}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (hasHeadline && !ariaLabel ? headlineId : undefined)}
      aria-describedby={ariaDescribedBy ?? (children ? bodyId : undefined)}
      className={cx(styles.root, tokens[variant], className)}
      data-variant={variant}
      data-has-icon={icon && !fullscreen ? '' : undefined}
      onPointerDown={(event: PointerEvent<HTMLDialogElement>) => {
        onPointerDown?.(event);
        modal.props.onPointerDown(event);
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        onClick?.(event);
        modal.props.onClick(event);
      }}
    >
      {fullscreen ? (
        <div className={styles.surface}>
          <header className={styles.header}>
            {navigation ? <div className={styles.navigation}>{navigation}</div> : null}
            {headlineNode}
            {actions ? <div className={styles.headerActions}>{actions}</div> : null}
          </header>
          {body}
        </div>
      ) : (
        <div className={styles.surface}>
          {icon ? (
            <div className={styles.icon} aria-hidden="true">
              {icon}
            </div>
          ) : null}
          {headlineNode}
          {body}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      )}
    </dialog>
  );
}
