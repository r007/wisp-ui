/**
 * Press ripple for Material state layers.
 *
 * Adapted from material-web (https://github.com/material-components/material-web,
 * `ripple/internal/ripple.ts`), Copyright 2022 Google LLC, Apache-2.0.
 *
 * Changes from the original:
 * - A framework-agnostic controller instead of a Lit element.
 * - Hover and focus are pure CSS (`:hover` behind `@media (hover: hover)`, and
 *   `:focus-visible`), so touch devices never get a sticky hover state.
 * - The "pressed" state is a `data-pressed` attribute set directly on the
 *   surface, so a press never causes a React render.
 * - The touch-delay timer and the minimum-press timer are cleaned up on
 *   `destroy()` instead of leaking past unmount.
 * - Honours `prefers-reduced-motion` by skipping the grow animation.
 */

const PRESS_GROW_MS = 450;
const MINIMUM_PRESS_MS = 225;
const INITIAL_ORIGIN_SCALE = 0.2;
const PADDING = 10;
const SOFT_EDGE_MINIMUM_SIZE = 75;
const SOFT_EDGE_CONTAINER_RATIO = 0.35;
/** Mirrors `--md-sys-motion-easing-standard`; WAAPI cannot read CSS variables. */
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';
/** Delay reacting to touch so a swipe or scroll does not flash a ripple. */
const TOUCH_DELAY_MS = 150;

/**
 * - mouse/pen: `inactive → waiting-for-click → inactive`
 * - touch: `inactive → touch-delay → (holding →) waiting-for-click → inactive`
 */
type State = 'inactive' | 'touch-delay' | 'holding' | 'waiting-for-click';

const EVENTS = [
  'click',
  'contextmenu',
  'pointercancel',
  'pointerdown',
  'pointerleave',
  'pointerup',
] as const;

export class RippleController {
  readonly #control: HTMLElement;
  readonly #surface: HTMLElement;
  readonly #forcedColors = window.matchMedia('(forced-colors: active)');
  readonly #reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  #state: State = 'inactive';
  #startEvent: PointerEvent | undefined;
  #grow: Animation | undefined;
  #touchTimer: ReturnType<typeof setTimeout> | undefined;
  #releaseTimer: ReturnType<typeof setTimeout> | undefined;
  #initialSize = 0;
  #scale = 1;

  /**
   * @param control Element that receives the pointer events (e.g. the button).
   * @param surface Absolutely positioned child whose `::after` draws the ripple.
   */
  constructor(control: HTMLElement, surface: HTMLElement) {
    this.#control = control;
    this.#surface = surface;
    for (const type of EVENTS) control.addEventListener(type, this.#onEvent);
  }

  destroy(): void {
    for (const type of EVENTS) this.#control.removeEventListener(type, this.#onEvent);
    clearTimeout(this.#touchTimer);
    clearTimeout(this.#releaseTimer);
    this.#grow?.cancel();
    this.#grow = undefined;
    this.#setPressed(false);
  }

  readonly #onEvent = (event: Event): void => {
    // The surface is `display: none` in forced-colors mode, so skip the work.
    if (this.#forcedColors.matches) return;
    switch (event.type) {
      case 'click':
        this.#handleClick();
        break;
      case 'contextmenu':
        this.#endPress();
        break;
      case 'pointercancel':
        if (this.#shouldReact(event as PointerEvent)) this.#endPress();
        break;
      case 'pointerleave':
        // Releases a held mouse or pen press that moves outside the control.
        if (this.#shouldReact(event as PointerEvent) && this.#state !== 'inactive')
          this.#endPress();
        break;
      case 'pointerdown':
        this.#handlePointerDown(event as PointerEvent);
        break;
      case 'pointerup':
        this.#handlePointerUp(event as PointerEvent);
        break;
    }
  };

  #handlePointerDown(event: PointerEvent): void {
    if (!this.#shouldReact(event)) return;
    this.#startEvent = event;

    if (!isTouch(event)) {
      this.#state = 'waiting-for-click';
      this.#startPress(event);
      return;
    }

    this.#state = 'touch-delay';
    this.#touchTimer = setTimeout(() => {
      if (this.#state !== 'touch-delay') return;
      this.#state = 'holding';
      this.#startPress(event);
    }, TOUCH_DELAY_MS);
  }

  #handlePointerUp(event: PointerEvent): void {
    if (!this.#shouldReact(event)) return;

    if (this.#state === 'holding') {
      this.#state = 'waiting-for-click';
    } else if (this.#state === 'touch-delay') {
      this.#state = 'waiting-for-click';
      clearTimeout(this.#touchTimer);
      this.#startPress(this.#startEvent);
    }
  }

  #handleClick(): void {
    if (this.#state === 'waiting-for-click') {
      this.#endPress();
    } else if (this.#state === 'inactive') {
      // A click without a preceding pointerdown is keyboard activation.
      this.#startPress();
      this.#endPress();
    }
  }

  /**
   * Whether this pointer event should drive the ripple: primary pointer only,
   * the pointer that started the press, and (for mouse/pen) the primary button.
   */
  #shouldReact(event: PointerEvent): boolean {
    if (!event.isPrimary) return false;
    if (this.#startEvent && this.#startEvent.pointerId !== event.pointerId) return false;
    if (event.type === 'pointerleave') return !isTouch(event);
    return isTouch(event) || event.buttons === 1;
  }

  #startPress(positionEvent?: PointerEvent): void {
    clearTimeout(this.#releaseTimer);
    this.#setPressed(true);
    this.#grow?.cancel();
    this.#measure();

    const { start, end } = this.#translation(positionEvent);
    const size = `${this.#initialSize}px`;
    this.#grow = this.#surface.animate(
      {
        top: [0, 0],
        left: [0, 0],
        height: [size, size],
        width: [size, size],
        transform: [
          `translate(${start.x}px, ${start.y}px) scale(1)`,
          `translate(${end.x}px, ${end.y}px) scale(${this.#scale})`,
        ],
      },
      {
        pseudoElement: '::after',
        duration: this.#reducedMotion.matches ? 0 : PRESS_GROW_MS,
        easing: EASING,
        fill: 'forwards',
      },
    );
  }

  /** Releases the press, but keeps the ripple visible for a minimum time so a quick tap is seen. */
  #endPress(): void {
    this.#startEvent = undefined;
    this.#state = 'inactive';
    clearTimeout(this.#touchTimer);

    const animation = this.#grow;
    const current = animation?.currentTime;
    const elapsed =
      typeof current === 'number'
        ? current
        : current
          ? current.to('ms').value
          : Number.POSITIVE_INFINITY;

    if (elapsed >= MINIMUM_PRESS_MS) {
      this.#setPressed(false);
      return;
    }
    this.#releaseTimer = setTimeout(() => {
      // A newer press replaced this animation and owns the pressed state now.
      if (this.#grow === animation) this.#setPressed(false);
    }, MINIMUM_PRESS_MS - elapsed);
  }

  #setPressed(pressed: boolean): void {
    this.#surface.toggleAttribute('data-pressed', pressed);
  }

  #measure(): void {
    const { height, width } = this.#surface.getBoundingClientRect();
    const maxDimension = Math.max(height, width);
    const softEdge = Math.max(SOFT_EDGE_CONTAINER_RATIO * maxDimension, SOFT_EDGE_MINIMUM_SIZE);
    const zoom = this.#surface.currentCSSZoom ?? 1;

    this.#initialSize = Math.floor((maxDimension * INITIAL_ORIGIN_SCALE) / zoom);
    const maxRadius = Math.hypot(width, height) + PADDING;
    // CSS `zoom` alters the measured size, so compensate in the final scale.
    this.#scale = (maxRadius + softEdge) / this.#initialSize / zoom;
  }

  #translation(positionEvent?: PointerEvent): { start: Point; end: Point } {
    const { height, width, left, top } = this.#surface.getBoundingClientRect();
    const zoom = this.#surface.currentCSSZoom ?? 1;
    const half = this.#initialSize / 2;

    // Grow from the press point (or the centre for keyboard) to the centre.
    const origin = positionEvent
      ? { x: (positionEvent.clientX - left) / zoom, y: (positionEvent.clientY - top) / zoom }
      : { x: width / zoom / 2, y: height / zoom / 2 };

    return {
      start: { x: origin.x - half, y: origin.y - half },
      end: {
        x: (width / zoom - this.#initialSize) / 2,
        y: (height / zoom - this.#initialSize) / 2,
      },
    };
  }
}

interface Point {
  x: number;
  y: number;
}

function isTouch({ pointerType }: PointerEvent): boolean {
  return pointerType === 'touch';
}
