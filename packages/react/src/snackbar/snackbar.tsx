'use client';

import {
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import { StateLayer } from '../foundation/state-layer.js';
import { usePopover } from '../foundation/use-popover.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import styles from './snackbar.module.css';
import tokens from './snackbar.tokens.generated.module.css';

export interface SnackbarProps {
  /** Whether the snackbar is shown. */
  open: boolean;
  /** Called when it should close: the time is up, or the user dismissed it. */
  onOpenChange?: (open: boolean) => void;
  /** The message. Keep it to one or two short lines. */
  children: ReactNode;
  /** Label of a single action, such as "Undo". */
  actionLabel?: string;
  /** Called when the action is pressed. The snackbar then closes. */
  onAction?: () => void;
  /** Adds a close button. */
  dismissible?: boolean;
  /** Accessible name of the close button. @default 'Dismiss' */
  dismissLabel?: string;
  /**
   * Milliseconds before it closes itself, paused while the pointer or focus is on it.
   * `null` keeps it until dismissed. @default 4000
   */
  duration?: number | null;
  /** Called once it has finished animating out. */
  onExited?: () => void;
  className?: string;
}

const CLOSE_PATH =
  'm249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z';

/**
 * A snackbar: a brief message about an app process, shown at the bottom of the screen, with
 * at most one action. It lives in the top layer, so it appears above dialogs. For a queue of
 * messages see `SnackbarProvider`.
 *
 * ```tsx
 * <Snackbar open={open} onOpenChange={setOpen} actionLabel="Undo" onAction={undo}>
 *   Message archived
 * </Snackbar>
 * ```
 */
export function Snackbar({
  open,
  onOpenChange,
  children,
  actionLabel,
  onAction,
  dismissible = false,
  dismissLabel = 'Dismiss',
  duration = 4000,
  onExited,
  className,
}: SnackbarProps) {
  const popover = usePopover({ open, onOpenChange, dismissible: false, onExited });
  const action = useStateLayer<HTMLButtonElement>();
  const close = useStateLayer<HTMLButtonElement>();

  // The clock stops while it is being read or used, and starts again from what is left.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const remaining = useRef(duration ?? 0);
  const startedAt = useRef(0);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const stop = useCallback(() => {
    if (timer.current === undefined) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    remaining.current -= Date.now() - startedAt.current;
  }, []);
  const start = useCallback(() => {
    if (duration === null || timer.current !== undefined) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(
      () => {
        timer.current = undefined;
        onOpenChangeRef.current?.(false);
      },
      Math.max(remaining.current, 0),
    );
  }, [duration]);

  useEffect(() => {
    if (!open) return;
    remaining.current = duration ?? 0;
    start();
    return () => {
      clearTimeout(timer.current);
      timer.current = undefined;
    };
  }, [open, duration, start]);

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hovering pauses the clock as a pointer nicety; focusing something inside (onFocus) is the keyboard equivalent.
    <div
      ref={popover.ref as RefObject<HTMLDivElement>}
      popover="manual"
      role="status"
      className={cx(styles.root, tokens.root, className)}
      onPointerEnter={stop}
      onPointerLeave={(event: PointerEvent) => event.pointerType !== 'touch' && start()}
      onFocus={stop}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) start();
      }}
    >
      <p className={styles.message}>{children}</p>
      {actionLabel || dismissible ? (
        <div className={styles.actions}>
          {actionLabel ? (
            <button
              ref={action.controlRef}
              type="button"
              className={styles.action}
              onClick={() => {
                onAction?.();
                onOpenChange?.(false);
              }}
            >
              <StateLayer ref={action.surfaceRef} />
              {actionLabel}
            </button>
          ) : null}
          {dismissible ? (
            <button
              ref={close.controlRef}
              type="button"
              className={styles.close}
              aria-label={dismissLabel}
              onClick={() => onOpenChange?.(false)}
            >
              <StateLayer ref={close.surfaceRef} />
              <svg viewBox="0 -960 960 960" aria-hidden="true">
                <path d={CLOSE_PATH} />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
