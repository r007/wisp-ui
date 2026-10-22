'use client';

import {
  cloneElement,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import { mergeProps, type RootProps } from '../foundation/merge-props.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { usePopover } from '../foundation/use-popover.js';
import styles from './tooltip.module.css';
import tokens from './tooltip.tokens.generated.module.css';

export type TooltipVariant = 'plain' | 'rich';
export type TooltipPlacement = 'top' | 'bottom' | 'start' | 'end';

export interface TooltipProps {
  /** The element the tooltip describes. It must accept a ref, a style and event handlers. */
  children: ReactElement;
  /** The text. Keep a plain tooltip to a few words. */
  content: ReactNode;
  /**
   * `plain` is a short label. `rich` is a surface for a sentence or two, with an optional
   * subhead and actions, and stays open while the pointer is on it.
   * @default 'plain'
   */
  variant?: TooltipVariant;
  /** Rich only: a title above the text. */
  subhead?: ReactNode;
  /** Rich only: buttons below the text. A tooltip with actions is a non-modal dialog. */
  actions?: ReactNode;
  /** Which side of the trigger; it flips when there is no room. @default 'top' for plain, 'bottom' for rich */
  placement?: TooltipPlacement;
  /** Milliseconds the pointer must rest on the trigger. Keyboard focus shows it at once. @default 500 */
  delay?: number;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** The pointer may cross the gap to a rich tooltip without closing it. */
const LEAVE_GRACE_MS = 120;

/**
 * A tooltip: a label for a control that shows on hover and keyboard focus, and goes on
 * Escape, a press, or leaving. The trigger gets `aria-describedby`.
 *
 * ```tsx
 * <Tooltip content="Add to favourites">
 *   <IconButton aria-label="Favourite"><StarIcon /></IconButton>
 * </Tooltip>
 * ```
 */
export function Tooltip({
  children,
  content,
  variant = 'plain',
  subhead,
  actions,
  placement,
  delay = 500,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
}: TooltipProps) {
  const id = useId();
  const subheadId = useId();
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const popover = usePopover({ open, onOpenChange: setOpen, dismissible: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rich = variant === 'rich';
  const side = placement ?? (rich ? 'bottom' : 'top');
  const interactive = rich && actions !== undefined;

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);
  const show = useCallback(
    (after: number) => {
      cancel();
      if (after <= 0) setOpen(true);
      else timer.current = setTimeout(() => setOpen(true), after);
    },
    [cancel, setOpen],
  );
  const hide = useCallback(
    (after: number) => {
      cancel();
      if (after <= 0) setOpen(false);
      else timer.current = setTimeout(() => setOpen(false), after);
    },
    [cancel, setOpen],
  );
  // No tooltip should appear after its trigger is gone.
  useEffect(() => cancel, [cancel]);

  // Escape dismisses from anywhere while it is showing, not only from the trigger.
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') hide(0);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, hide]);

  const trigger = children as ReactElement<RootProps>;
  const own: RootProps = {
    children: trigger.props.children,
    style: popover.anchorStyle,
    'aria-describedby': interactive ? undefined : id,
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      // Touch has no hover: a tap would otherwise leave a tooltip behind.
      if (event.pointerType !== 'touch') show(delay);
    },
    onPointerLeave: () => hide(rich ? LEAVE_GRACE_MS : 0),
    onPointerDown: () => hide(0),
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.matches(':focus-visible')) show(0);
    },
    onBlur: () => hide(0),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') hide(0);
    },
  };

  return (
    <>
      {cloneElement(trigger, mergeProps(own, trigger.props))}
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-labelledby is set only when the role is `dialog` (a tooltip with actions), which supports it; the role is chosen at run time. */}
      <div
        ref={popover.ref as RefObject<HTMLDivElement>}
        id={id}
        popover="manual"
        role={interactive ? 'dialog' : 'tooltip'}
        aria-labelledby={interactive && subhead ? subheadId : undefined}
        style={popover.popoverStyle}
        className={cx(styles.root, tokens[variant], rich ? styles.rich : styles.plain, className)}
        data-placement={side}
        // A rich tooltip is a place the pointer can go: it must not close underneath it.
        onPointerEnter={rich ? cancel : undefined}
        onPointerLeave={rich ? () => hide(LEAVE_GRACE_MS) : undefined}
      >
        {rich && subhead ? (
          <h2 id={subheadId} className={styles.subhead}>
            {subhead}
          </h2>
        ) : null}
        <p className={styles.text}>{content}</p>
        {rich && actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </>
  );
}
