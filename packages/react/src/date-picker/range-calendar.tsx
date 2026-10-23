'use client';

import { type KeyboardEvent, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import visuallyHidden from '../foundation/visually-hidden.module.css';
import {
  addDays,
  addMonths,
  clampDate,
  compareDays,
  firstDayOfWeek,
  formatter,
  isSameDay,
  monthGrid,
  startOfDay,
  startOfMonth,
  weekdayNames,
} from './date-utils.js';
import { DayCell, type RangePart } from './day-cell.js';
import styles from './range-calendar.module.css';

/** A range of days. While one is being chosen it has a `start` and no `end` yet; empty is both `null`. */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export const EMPTY_RANGE: DateRange = { start: null, end: null };

/**
 * What choosing a day does to a range: the first day starts one, the second ends it, and a day
 * before the start, or one chosen once the range is whole, starts another.
 */
export function chooseInRange(range: DateRange, date: Date): DateRange {
  if (!range.start || range.end) return { start: date, end: null };
  if (compareDays(date, range.start) < 0) return { start: date, end: null };
  return { start: range.start, end: date };
}

export interface RangeCalendarProps {
  value: DateRange;
  /** Called with the range as each day is chosen. */
  onChange: (range: DateRange) => void;
  min?: Date | undefined;
  max?: Date | undefined;
  /** Days that cannot be chosen, besides those outside `min` and `max`. */
  isDateDisabled?: ((date: Date) => boolean) | undefined;
  /** What today is. @default the current date */
  today?: Date | undefined;
  locale?: string | undefined;
  /** The day a week starts on, 0 for Sunday to 6; the locale's own by default. */
  firstDayOfWeek?: number | undefined;
}

/** How a day sits in a range, or `undefined` when it is not in one. */
function partOf(range: DateRange, date: Date): RangePart | undefined {
  const { start, end } = range;
  if (!start) return undefined;
  if (!end || isSameDay(start, end)) return isSameDay(date, start) ? 'single' : undefined;
  if (isSameDay(date, start)) return 'start';
  if (isSameDay(date, end)) return 'end';
  return compareDays(date, start) > 0 && compareDays(date, end) < 0 ? 'middle' : undefined;
}

/**
 * Months one under the other in a scroll, with the weekday names above them, to choose a range
 * from. It is the same grid as the single-day calendar, one table a month: the arrow keys, Home
 * and End, and Page Up and Page Down move across all of them, and every day is named in full.
 * The months are drawn when they scroll into view (`content-visibility`), so a few years of them
 * cost no more than the few on show.
 */
export function RangeCalendar({
  value,
  onChange,
  min,
  max,
  isDateDisabled,
  today: todayProp,
  locale,
  firstDayOfWeek: weekStartProp,
}: RangeCalendarProps) {
  const today = useMemo(() => startOfDay(todayProp ?? new Date()), [todayProp]);
  const weekStart = weekStartProp ?? firstDayOfWeek(locale);
  const names = useMemo(() => weekdayNames(locale, weekStart), [locale, weekStart]);

  // The months on show: from min or a year back, to max or three years on.
  const first = startOfMonth(min ?? addMonths(today, -12));
  const last = startOfMonth(max ?? addMonths(today, 36));
  const months = useMemo(() => {
    const list: Date[] = [];
    for (let month = first; month <= last; month = addMonths(month, 1)) list.push(month);
    return list;
  }, [first, last]);

  const [focused, setFocused] = useState(() => clampDate(value.start ?? today, min, max));
  const scroller = useRef<HTMLDivElement>(null);
  const focusDay = useRef(false);

  const disabled = useCallback(
    (date: Date) =>
      (min !== undefined && compareDays(date, min) < 0) ||
      (max !== undefined && compareDays(date, max) > 0) ||
      isDateDisabled?.(date) === true,
    [min, max, isDateDisabled],
  );

  const choose = (date: Date) => {
    if (disabled(date)) return;
    setFocused(date);
    onChange(chooseInRange(value, date));
  };

  // Open on the month of the start of the range, or today's. A dialog's contents are made while it
  // is still closed and have no size, so this waits for the list to have one, then scrolls once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the first size scrolls.
  useLayoutEffect(() => {
    const list = scroller.current;
    if (!list) return;
    const scrollToStart = () => {
      if (list.clientHeight === 0) return false;
      const section = list.querySelector<HTMLElement>(
        `[data-month="${focused.getFullYear()}-${focused.getMonth()}"]`,
      );
      if (section) list.scrollTop = section.offsetTop;
      return true;
    };
    if (scrollToStart()) return;
    const observer = new ResizeObserver(() => {
      if (scrollToStart()) observer.disconnect();
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!focusDay.current) return;
    focusDay.current = false;
    scroller.current?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus();
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const weekday = (focused.getDay() - weekStart + 7) % 7;
    let next: Date | undefined;
    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(focused, rtl ? 1 : -1);
        break;
      case 'ArrowRight':
        next = addDays(focused, rtl ? -1 : 1);
        break;
      case 'ArrowUp':
        next = addDays(focused, -7);
        break;
      case 'ArrowDown':
        next = addDays(focused, 7);
        break;
      case 'Home':
        next = addDays(focused, -weekday);
        break;
      case 'End':
        next = addDays(focused, 6 - weekday);
        break;
      case 'PageUp':
        next = addMonths(focused, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = addMonths(focused, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    // Within the months on show, and within min and max.
    const target = clampDate(
      next,
      min && compareDays(min, first) > 0 ? min : first,
      max && compareDays(max, addDays(addMonths(last, 1), -1)) < 0
        ? max
        : addDays(addMonths(last, 1), -1),
    );
    focusDay.current = true;
    setFocused(target);
  };

  const tabStop = clampDate(focused, first, addDays(addMonths(last, 1), -1));

  return (
    <div className={styles.range}>
      <div className={styles.weekdays} aria-hidden="true">
        {names.map((name) => (
          <span key={name.long} className={styles.weekday}>
            {name.narrow}
          </span>
        ))}
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the arrow keys are heard as they bubble up from the days, which are the controls; the scroll container itself takes none. */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: as above. */}
      <div ref={scroller} className={styles.scroller} onKeyDown={onKeyDown}>
        {months.map((month) => {
          const key = `${month.getFullYear()}-${month.getMonth()}`;
          const weeks = monthGrid(month.getFullYear(), month.getMonth(), weekStart);
          const headingId = `range-${key}`;
          return (
            <section
              key={key}
              className={styles.month}
              data-month={key}
              style={{ '--_rows': weeks.length } as React.CSSProperties}
            >
              <h3 id={headingId} className={styles.subhead}>
                {formatter(locale, { month: 'long', year: 'numeric' }).format(month)}
              </h3>
              <table
                className={styles.grid}
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a table of days with the arrow keys moving between them is an ARIA grid, as in the APG date picker.
                role="grid"
                aria-multiselectable="true"
                aria-labelledby={headingId}
              >
                <thead className={visuallyHidden.visuallyHidden}>
                  <tr>
                    {names.map((name) => (
                      <th key={name.long} scope="col">
                        {name.long}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week) => (
                    <tr key={week[0]?.getTime()}>
                      {week.map((date, column) => {
                        const part = partOf(value, date);
                        return (
                          <DayCell
                            key={date.getTime()}
                            date={date}
                            locale={locale}
                            hidden={date.getMonth() !== month.getMonth()}
                            outside={false}
                            selected={part === 'start' || part === 'end' || part === 'single'}
                            today={isSameDay(date, today)}
                            disabled={disabled(date)}
                            tabStop={isSameDay(date, tabStop)}
                            range={part}
                            edge={column === 0 ? 'start' : column === 6 ? 'end' : undefined}
                            onChoose={choose}
                            onFocused={setFocused}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </div>
  );
}
