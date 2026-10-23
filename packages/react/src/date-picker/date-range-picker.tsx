'use client';

import type { ComponentPropsWithRef } from 'react';
import { cx } from '../foundation/cx.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import tokens from './date-picker.tokens.generated.module.css';
import styles from './date-range-picker.module.css';
import { type DateRange, EMPTY_RANGE, RangeCalendar } from './range-calendar.js';

export interface DateRangePickerProps
  extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange' | 'children'> {
  /** The chosen range. While one is being chosen it has a `start` and no `end`. Controlled when defined. */
  value?: DateRange;
  defaultValue?: DateRange;
  /** Called with the range as each day is chosen: the first starts it, the second ends it. */
  onValueChange?: (range: DateRange) => void;
  /** The earliest day that can be chosen, and where the months begin. */
  min?: Date;
  /** The latest day that can be chosen, and where the months end. */
  max?: Date;
  /** Days that cannot be chosen, besides those outside `min` and `max`. */
  isDateDisabled?: (date: Date) => boolean;
  /** What today is, for its outline. @default the current date */
  today?: Date;
  /** The locale that names the months and days, e.g. `de-DE`. @default the browser's */
  locale?: string;
  /** The day a week starts on, 0 for Sunday to 6. @default the locale's own */
  firstDayOfWeek?: number;
}

/**
 * Months in a scroll to choose a range of days from: press a day to start the range and another
 * to end it (one before the start, or any once it is whole, starts a new one). It is as tall as
 * you make it (480px by default) and scrolls inside. Use `DateRangePickerDialog` for the modal.
 *
 * ```tsx
 * <DateRangePicker value={range} onValueChange={setRange} style={{ blockSize: 560 }} />
 * ```
 */
export function DateRangePicker({
  value: valueProp,
  defaultValue = EMPTY_RANGE,
  onValueChange,
  min,
  max,
  isDateDisabled,
  today,
  locale,
  firstDayOfWeek,
  className,
  ref,
  ...rest
}: DateRangePickerProps) {
  const [value, setValue] = useControllableState<DateRange>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(styles.root, tokens.root, tokens.modal, tokens.range, className)}
    >
      <RangeCalendar
        value={value}
        onChange={setValue}
        min={min}
        max={max}
        isDateDisabled={isDateDisabled}
        today={today}
        locale={locale}
        firstDayOfWeek={firstDayOfWeek}
      />
    </div>
  );
}
