import { type CSSProperties, type RefObject, useEffect, useId, useRef } from 'react';

export type PopoverDismissReason = 'escape' | 'outside';

export interface PopoverOptions {
  /** Whether the popover is shown. The parent owns this; the hook makes the DOM follow it. */
  open: boolean;
  /**
   * Called when the user dismisses it. `reason` says how: Escape, where focus should go back
   * to the trigger, or a press elsewhere, where the user has chosen somewhere else to be.
   */
  onOpenChange?: ((open: boolean, reason?: PopoverDismissReason) => void) | undefined;
  /** Dismiss on an outside press and on Escape. @default true */
  dismissible?: boolean;
  /**
   * Elements a press on which is not "outside": the anchor that toggles the popover, so
   * pressing it again does not close the popover and then immediately reopen it.
   */
  ignore?: ReadonlyArray<RefObject<Element | null>>;
}

/**
 * Drives a native popover (`popover="manual"`), placed against an anchor by CSS anchor
 * positioning, so no script measures or moves anything:
 *
 * ```tsx
 * const { ref, anchorStyle, popoverStyle } = usePopover({ open, onOpenChange });
 * <button style={anchorStyle}>…</button>
 * <div ref={ref} popover="manual" style={popoverStyle} className={styles.panel}>…</div>
 * ```
 *
 * with `position-area` (and `position-try-fallbacks`) in the panel's CSS choosing the side.
 *
 * The popover is manual, not `auto`, on purpose. The platform's light dismiss would hide it
 * at once, and Firefox cannot hold a hidden-by-the-platform popover on screen for an exit
 * animation. So dismissal is done here, and closing keeps the popover shown with a
 * `data-closing` attribute (style that as the "exited" state) until the animations that
 * started have finished. It also works with reduced motion: no animations, so no waiting.
 */
export function usePopover({ open, onOpenChange, dismissible = true, ignore }: PopoverOptions) {
  const ref = useRef<HTMLElement>(null);
  const id = useId();
  // A dashed ident, unique to this instance, ties the popover to its anchor.
  const anchorName = `--wisp-anchor-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const ignoreRef = useRef(ignore);
  ignoreRef.current = ignore;

  useEffect(() => {
    const popover = ref.current;
    if (!popover) return;

    if (open) {
      popover.removeAttribute('data-closing');
      if (!popover.matches(':popover-open')) popover.showPopover();
      return;
    }
    if (!popover.matches(':popover-open')) return;

    // `getAnimations()` flushes style, so it already sees the transitions that the
    // attribute starts.
    let cancelled = false;
    popover.setAttribute('data-closing', '');
    const running = popover.getAnimations({ subtree: true });
    Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
      if (cancelled) return;
      if (popover.matches(':popover-open')) popover.hidePopover();
      popover.removeAttribute('data-closing');
    });
    return () => {
      // Reopened mid-exit: the effect above takes it from here.
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const popover = ref.current;

    const outside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || popover?.contains(target)) return;
      if (ignoreRef.current?.some((entry) => entry.current?.contains(target))) return;
      onOpenChangeRef.current?.(false, 'outside');
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.stopPropagation();
      onOpenChangeRef.current?.(false, 'escape');
    };
    // Capture, so a press that something inside stops from bubbling still counts.
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', onEscape, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', onEscape, true);
    };
  }, [open, dismissible]);

  return {
    ref,
    /** The anchor's CSS identifier, for components that set it themselves. */
    anchorName,
    /** Spread on the element the popover is placed against. */
    anchorStyle: { anchorName } as CSSProperties,
    /** Spread on the popover. */
    popoverStyle: { positionAnchor: anchorName } as CSSProperties,
  };
}
