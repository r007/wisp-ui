import { type PointerEvent, type RefObject, useRef } from 'react';

/** How far a drag must go, in px or as a share of the sheet's height, to dismiss it. */
const DISMISS_PX = 96;
const DISMISS_SHARE = 0.3;

/**
 * The drag handle of a bottom sheet: a press (or Enter or Space) on it dismisses the sheet, and
 * so does a drag far enough down. While it is held the sheet follows the pointer (`--_drag`, and
 * `data-dragging` to switch its spring off); short of the threshold the spring puts it back.
 */
export function useSheetHandle(sheet: RefObject<HTMLElement | null>, dismiss: () => void) {
  /** The pointer drag on the handle, or nothing while it is not held. */
  const drag = useRef<{ startY: number; offset: number } | null>(null);
  /** The click that follows a real drag is not a press on the handle. */
  const dragged = useRef(false);

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      drag.current = { startY: event.clientY, offset: 0 };
      try {
        // Keeps the drag when the pointer leaves the handle; a pointer that has already
        // ended has nothing to capture, and the drag still works without it.
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {}
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const held = drag.current;
      const el = sheet.current;
      if (!held || !el) return;
      held.offset = Math.max(0, event.clientY - held.startY);
      el.toggleAttribute('data-dragging', held.offset > 0);
      el.style.setProperty('--_drag', `${held.offset}px`);
    },
    onPointerUp() {
      const held = drag.current;
      const el = sheet.current;
      drag.current = null;
      if (!held || !el) return;
      dragged.current = held.offset > 4;
      el.removeAttribute('data-dragging');
      el.style.removeProperty('--_drag');
      // Past a threshold it is dismissed; short of it, the spring puts it back.
      if (held.offset > Math.min(DISMISS_PX, el.getBoundingClientRect().height * DISMISS_SHARE)) {
        dismiss();
      }
    },
    onClick() {
      // A press (or Enter or Space) on the handle closes the sheet; a drag has already
      // decided what to do.
      const afterDrag = dragged.current;
      dragged.current = false;
      if (!afterDrag) dismiss();
    },
  };
}
