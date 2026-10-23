import { type RefObject, useEffect } from 'react';

/**
 * Lets a mouse wheel scroll a row that only scrolls sideways. A wheel turns on the vertical
 * axis, so over a horizontal scroller (tabs, a carousel) it does nothing and, with the
 * scrollbar hidden, a mouse has no other way to move it. The vertical delta is applied to
 * `scrollLeft` instead.
 *
 * The page keeps scrolling when the row cannot move any further in that direction, and a
 * gesture that is already horizontal (a trackpad, Shift + wheel) is left to the browser.
 */
export function useWheelScroll(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const onWheel = (event: WheelEvent) => {
      // `ctrlKey` is a pinch zoom; a mostly horizontal delta is already doing the job.
      if (event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const max = element.scrollWidth - element.clientWidth;
      if (max <= 0) return;
      // Wheel deltas arrive in pixels, lines or pages.
      const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? element.clientWidth : 1;
      const delta = event.deltaY * unit;
      // `scrollLeft` is zero at the start edge and negative towards the end in a right-to-left row.
      const rtl = getComputedStyle(element).direction === 'rtl';
      const position = rtl ? -element.scrollLeft : element.scrollLeft;
      // Scroll positions are fractional on a zoomed page, so allow a pixel of slack at the ends.
      if ((delta < 0 && position <= 1) || (delta > 0 && position >= max - 1)) return;
      event.preventDefault();
      element.scrollBy({ left: rtl ? -delta : delta });
    };
    // React registers `wheel` as passive, which forbids `preventDefault`.
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [ref, enabled]);
}
