'use client';

import {
  type ChangeEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import type { SliderSize } from './slider.js';
import styles from './slider.module.css';
import tokens from './slider.tokens.generated.module.css';

export type RangeValue = readonly [number, number];

type Handle = 'low' | 'high';

/** How far from a handle's centre a press still grabs it: a 48px target around a 4px handle. */
const GRAB_RADIUS = 24;

const decimals = (n: number) => String(n).split('.')[1]?.length ?? 0;

export interface RangeSliderProps
  extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange' | 'children' | 'role'> {
  /** The low and high values. Controlled when defined. */
  value?: RangeValue;
  defaultValue?: RangeValue;
  /** Called with `[low, high]` as either handle moves. */
  onValueChange?: (value: [number, number]) => void;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** @default 1 */
  step?: number;
  /** The least the two values may be apart. @default 0 */
  minDistance?: number;
  /** The thickness of the track: 16, 24, 40, 56 or 96px. @default 'xsmall' */
  size?: SliderSize;
  /** Shows each value in a bubble above its handle while it is held or focused. @default true */
  showValue?: boolean;
  /** Formats the numbers in the bubbles, and in `aria-valuetext` when it returns text. */
  formatValue?: (value: number) => ReactNode;
  /** Names the low handle. @default 'Minimum' */
  startLabel?: string;
  /** Names the high handle. @default 'Maximum' */
  endLabel?: string;
  disabled?: boolean;
  /** Names the range; the two handles are named by `startLabel` and `endLabel`. */
  'aria-label': string;
}

/**
 * A slider with two handles, for a range such as a price. Two native `<input type="range">`s give
 * the keyboard and assistive technology their behaviour; the pointer is handled on the whole
 * control rather than on the inputs' thumbs, which are only as wide as the handle (4px) and would
 * leave almost nothing to grab. Pressing within 24px of a handle grabs it, pressing the track
 * moves the nearer handle there, and either way the drag carries on. The handles cannot cross,
 * or come closer than `minDistance`.
 *
 * ```tsx
 * <RangeSlider aria-label="Price" defaultValue={[20, 60]} formatValue={(v) => `$${v}`} />
 * ```
 */
export function RangeSlider({
  value: valueProp,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  minDistance = 0,
  size = 'xsmall',
  showValue = true,
  formatValue,
  startLabel = 'Minimum',
  endLabel = 'Maximum',
  disabled,
  className,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  ref,
  ...rest
}: RangeSliderProps) {
  const [value, setValue] = useControllableState<RangeValue>({
    value: valueProp,
    defaultValue: defaultValue ?? [min, max],
    onChange: onValueChange as ((next: RangeValue) => void) | undefined,
  });
  const [low, high] = value;
  const lowInput = useRef<HTMLInputElement>(null);
  const highInput = useRef<HTMLInputElement>(null);
  const span = max - min;
  const toFraction = (n: number) => (span > 0 ? Math.min(Math.max((n - min) / span, 0), 1) : 0);
  const fractionLow = toFraction(low);
  const fractionHigh = toFraction(high);

  const setLow = (next: number) => {
    const clamped = Math.min(next, high - minDistance);
    if (clamped !== low) setValue([clamped, high]);
  };
  const setHigh = (next: number) => {
    const clamped = Math.max(next, low + minDistance);
    if (clamped !== high) setValue([low, clamped]);
  };

  /** The nearest value a step allows, to a precision that hides floating point error. */
  const snap = (n: number) => {
    const stepped = Math.round((n - min) / step) * step + min;
    const precision = Math.max(decimals(step), decimals(min));
    return Math.min(Math.max(Number(stepped.toFixed(precision)), min), max);
  };

  /** The handle being dragged, the pointer that holds it, and where on it the press landed. */
  const drag = useRef<{ pointerId: number; handle: Handle; offset: number } | null>(null);
  const [dragging, setDragging] = useState<Handle | null>(null);

  /** Where a pointer is along the track, as a fraction of the handles' travel (not clamped). */
  const trackPosition = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const computed = getComputedStyle(event.currentTarget);
    const handle = Number.parseFloat(computed.getPropertyValue('--_handle-width')) || 0;
    const along =
      computed.direction === 'rtl' ? box.right - event.clientX : event.clientX - box.left;
    const travel = Math.max(box.width - handle, 1);
    return { fraction: (along - handle / 2) / travel, travel };
  };

  const moveHandle = (handle: Handle, next: number) =>
    handle === 'low' ? setLow(next) : setHigh(next);

  /**
   * Presses pick the nearer handle. On a handle the drag keeps the offset between the pointer and
   * the handle's centre, so it does not jump; on the bare track the handle goes to the pointer.
   */
  const pressDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (disabled || event.defaultPrevented || event.button !== 0) return;
    const { fraction, travel } = trackPosition(event);
    const distanceLow = Math.abs(fraction - fractionLow);
    const distanceHigh = Math.abs(fraction - fractionHigh);
    let handle: Handle;
    if (distanceLow !== distanceHigh) handle = distanceLow < distanceHigh ? 'low' : 'high';
    // Equally near, as when the handles meet: the side of them the press is on decides, so a
    // pair at the end can still be pulled apart.
    else if (fraction < fractionLow) handle = 'low';
    else if (fraction > fractionHigh) handle = 'high';
    else handle = fractionLow >= 1 ? 'low' : 'high';

    const own = handle === 'low' ? low : high;
    const grabbed =
      Math.abs(fraction - (handle === 'low' ? fractionLow : fractionHigh)) * travel <= GRAB_RADIUS;
    const pointerValue = min + fraction * span;
    event.preventDefault();
    try {
      // Keeps the drag going when the pointer leaves the control.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer has already gone, or is not a live one.
    }
    drag.current = { pointerId: event.pointerId, handle, offset: grabbed ? pointerValue - own : 0 };
    setDragging(handle);
    // Focus follows the press so the arrow keys carry on from here, but this is not keyboard
    // use: without `focusVisible: false`, Chromium and Firefox would keep the value bubble and
    // the narrowed bar showing after the handle is let go.
    (handle === 'low' ? lowInput : highInput).current?.focus({
      preventScroll: true,
      focusVisible: false,
    } as FocusOptions);
    if (!grabbed) moveHandle(handle, snap(pointerValue));
  };

  const pressMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const { fraction } = trackPosition(event);
    moveHandle(current.handle, snap(min + fraction * span - current.offset));
  };

  const pressEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(null);
  };

  const formattedLow = formatValue ? formatValue(low) : low;
  const formattedHigh = formatValue ? formatValue(high) : high;
  const inputProps = (
    own: number,
    label: string,
    formatted: ReactNode,
    set: (next: number) => void,
  ) => ({
    type: 'range' as const,
    className: cx(styles.input, styles.rangeInput),
    'aria-label': label,
    'aria-valuetext': typeof formatted === 'string' ? formatted : undefined,
    min,
    max,
    step,
    value: own,
    disabled,
    onChange: (event: ChangeEvent<HTMLInputElement>) => set(event.currentTarget.valueAsNumber),
  });

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> brings a border, padding and a minimum width that a drawn control would have to undo; role="group" has the same meaning.
    <div
      {...rest}
      ref={ref}
      role="group"
      className={cx(styles.root, styles.range, tokens.root, tokens[`size-${size}`], className)}
      style={{ ...style, '--_lo': fractionLow, '--_hi': fractionHigh } as CSSProperties}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      data-lo-start={fractionLow <= 0.02 ? '' : undefined}
      data-hi-end={fractionHigh >= 0.98 ? '' : undefined}
      data-dragging={dragging ?? undefined}
      onPointerDown={pressDown}
      onPointerMove={pressMove}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        pressEnd(event);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        pressEnd(event);
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        pressEnd(event);
      }}
    >
      <input {...inputProps(low, startLabel, formattedLow, setLow)} ref={lowInput} />
      <input {...inputProps(high, endLabel, formattedHigh, setHigh)} ref={highInput} />
      <div className={styles.track} aria-hidden="true">
        <div className={cx(styles.inactive, styles.rangeStart)} />
        <div className={cx(styles.active, styles.rangeMiddle)} />
        <div className={cx(styles.inactive, styles.rangeEnd)} />
        <span className={cx(styles.stop, styles.stopStart)} />
        <span className={styles.stop} />
        <span className={cx(styles.handle, styles.handleLow)} />
        <span className={cx(styles.handle, styles.handleHigh)} />
      </div>
      {showValue ? (
        <>
          <output className={cx(styles.value, styles.valueLow)} aria-hidden="true">
            {formattedLow}
          </output>
          <output className={cx(styles.value, styles.valueHigh)} aria-hidden="true">
            {formattedHigh}
          </output>
        </>
      ) : null}
    </div>
  );
}
