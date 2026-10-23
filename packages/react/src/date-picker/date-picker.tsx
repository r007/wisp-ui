'use client';

import type { ComponentPropsWithRef } from 'react';
import { cx } from '../foundation/cx.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { Calendar, type CalendarLabels } from './calendar.js';
import styles from './date-picker.module.css';
import tokens from './date-picker.tokens.generated.module.css';

export type DatePickerVariant = 'docked' | 'modal';

export interface DatePickerProps
  extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange' | 'children'> {
  /** The chosen day, or `null` for none. Controlled when defined. */
  value?: Date | null;
  defaultValue?: Date | null;
  /** Called with the day that was chosen, at local midnight. */
  onValueChange?: (date: Date) => void;
  /** The earliest day that can be chosen. */
  min?: Date;
  /** The latest day that can be chosen. */
  max?: Date;
  /** Days that cannot be chosen, besides those outside `min` and `max`. */
  isDateDisabled?: (date: Date) => boolean;
  /** What today is, for its outline. @default the current date */
  today?: Date;
  /** The locale that names the months and days, e.g. `de-DE`. @default the browser's */
  locale?: string;
  /** The day a week starts on, 0 for Sunday to 6. @default the locale's own */
  firstDayOfWeek?: number;
  /**
   * `docked` is for under a text field or in a popover, with dimmed days from the months either
   * side; `modal` has smaller days and is what a dialog holds.
   * @default 'docked'
   */
  variant?: DatePickerVariant;
  /** What it opens on, if not the month of `value`. */
  defaultMonth?: Date;
  /** Replaces any of the texts, e.g. to translate them. */
  labels?: Partial<CalendarLabels>;
}

/**
 * A calendar to choose a day from. It is a surface to put under a text field or in a popover;
 * `DatePickerDialog` is the modal one, with a headline, typed input and Cancel and OK.
 *
 * ```tsx
 * <DatePicker value={date} onValueChange={setDate} min={new Date()} />
 * ```
 *
 * Days are `Date`s read in the local time zone, as a day only. The arrow keys move between
 * days, Page Up and Page Down between months, and the month button opens the years.
 */
export function DatePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min,
  max,
  isDateDisabled,
  today,
  locale,
  firstDayOfWeek,
  variant = 'docked',
  defaultMonth,
  labels,
  className,
  ref,
  ...rest
}: DatePickerProps) {
  const [value, setValue] = useControllableState<Date | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange as ((next: Date | null) => void) | undefined,
  });

  return (
    <div
      {...rest}
      ref={ref}
      className={cx(styles.root, tokens.root, tokens[variant], className)}
      data-variant={variant}
    >
      <Calendar
        value={value}
        onSelect={setValue}
        min={min}
        max={max}
        isDateDisabled={isDateDisabled}
        today={today}
        locale={locale}
        firstDayOfWeek={firstDayOfWeek}
        variant={variant}
        defaultMonth={defaultMonth}
        labels={labels}
      />
    </div>
  );
}
