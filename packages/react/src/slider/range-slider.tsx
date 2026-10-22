'use client';

import {
  type ChangeEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import type { SliderSize } from './slider.js';
import styles from './slider.module.css';
import tokens from './slider.tokens.generated.module.css';

export type RangeValue = readonly [number, number];

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
 * A slider with two handles, for a range such as a price: two native `<input type="range">`s, so
 * the keyboard, touch and assistive technology work without extra wiring. The handles cannot
 * cross, or come closer than `minDistance`. Pressing the track moves the nearer handle.
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

  const setLow = (next: number) => setValue([Math.min(next, high - minDistance), high]);
  const setHigh = (next: number) => setValue([low, Math.max(next, low + minDistance)]);

  /** Pressing the track, away from a handle, moves the handle nearer to the press. */
  const pressTrack = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (disabled || event.defaultPrevented || event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    const handle =
      Number.parseFloat(
        getComputedStyle(event.currentTarget).getPropertyValue('--_handle-width'),
      ) || 0;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const along = rtl ? box.right - event.clientX : event.clientX - box.left;
    const fraction = Math.min(
      Math.max((along - handle / 2) / Math.max(box.width - handle, 1), 0),
      1,
    );
    const raw = min + fraction * span;
    const stepped = Math.round((raw - min) / step) * step + min;
    const clamped = Math.min(Math.max(stepped, min), max);
    event.preventDefault();
    if (Math.abs(clamped - low) <= Math.abs(clamped - high) && clamped <= high) {
      setLow(clamped);
      lowInput.current?.focus();
    } else {
      setHigh(clamped);
      highInput.current?.focus();
    }
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
      onPointerDown={pressTrack}
    >
      <input
        {...inputProps(low, startLabel, formattedLow, setLow)}
        ref={lowInput}
        // Past the middle, the low handle must stay reachable when both are at the end.
        data-front={fractionLow > 0.5 ? '' : undefined}
      />
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
