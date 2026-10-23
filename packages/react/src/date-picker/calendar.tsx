'use client';

import {
  type KeyboardEvent,
  memo,
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import visuallyHidden from '../foundation/visually-hidden.module.css';
import { IconButton } from '../icon-button/icon-button.js';
import styles from './calendar.module.css';
import {
  addDays,
  addMonths,
  clampDate,
  compareDays,
  firstDayOfWeek,
  formatter,
  isSameDay,
  isSameMonth,
  monthGrid,
  startOfDay,
  startOfMonth,
  weekdayNames,
} from './date-utils.js';

/** The texts the calendar shows or announces, for translating them. */
export interface CalendarLabels {
  previousMonth: string;
  nextMonth: string;
  /** Added to the month button's name, which says it opens the years. */
  selectYear: string;
  /** Names the list of years. */
  years: string;
}

export const DEFAULT_CALENDAR_LABELS: CalendarLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  selectYear: 'Select year',
  years: 'Years',
};

const ChevronLeft = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M561-240 320-481l241-241 43 43-198 198 198 198-43 43Z" />
  </svg>
);

const ChevronRight = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M530-481 332-679l43-43 241 241-241 241-43-43 198-198Z" />
  </svg>
);

const DropDown = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M480-360 280-559h400L480-360Z" />
  </svg>
);

export interface CalendarProps {
  /** The chosen day, if any. */
  value: Date | null;
  /** Called when a day is chosen. */
  onSelect: (date: Date) => void;
  min?: Date | undefined;
  max?: Date | undefined;
  /** Days that cannot be chosen, besides those outside `min` and `max`. */
  isDateDisabled?: ((date: Date) => boolean) | undefined;
  /** What today is. @default the current date */
  today?: Date | undefined;
  /** The locale that names the months and days. @default the browser's */
  locale?: string | undefined;
  /** The day a week starts on, 0 for Sunday to 6; the locale's own by default. */
  firstDayOfWeek?: number | undefined;
  /**
   * `docked` shows the days of the months either side, dimmed, in the first and last rows, in
   * 48px cells; `modal` leaves them blank, in 40px ones.
   * @default 'docked'
   */
  variant?: 'docked' | 'modal' | undefined;
  labels?: Partial<CalendarLabels> | undefined;
  /** What the calendar opens on, if not the month of `value`. */
  defaultMonth?: Date | undefined;
  /** Extra buttons at the end of the toolbar. */
  toolbarEnd?: ReactNode;
}

/**
 * A month of days to choose from, with a button that swaps it for a grid of years. It is an
 * ARIA grid: one tab stop (the day that has the focus), the arrow keys move by a day or a week,
 * Home and End to the ends of the week, Page Up and Page Down by a month (with Shift, a year),
 * and every day is named in full ("Friday, October 23, 2026"), so a screen reader needs no more.
 */
export function Calendar({
  value,
  onSelect,
  min,
  max,
  isDateDisabled,
  today: todayProp,
  locale,
  firstDayOfWeek: weekStartProp,
  variant = 'docked',
  labels: labelsProp,
  defaultMonth,
  toolbarEnd,
}: CalendarProps) {
  const labels = { ...DEFAULT_CALENDAR_LABELS, ...labelsProp };
  const today = useMemo(() => startOfDay(todayProp ?? new Date()), [todayProp]);
  const weekStart = weekStartProp ?? firstDayOfWeek(locale);

  const [view, setView] = useState<'days' | 'years'>('days');
  /** The month on show, as its first day. */
  const [month, setMonth] = useState(() =>
    startOfMonth(clampDate(defaultMonth ?? value ?? today, min, max)),
  );
  /** The day that has the focus, or would if the grid were focused: the one tab stop. */
  const [focused, setFocused] = useState(() => clampDate(value ?? defaultMonth ?? today, min, max));
  /** Which way the month last turned, for its slide. */
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const ids = { label: useId(), years: useId() };
  const grid = useRef<HTMLTableElement>(null);
  const yearList = useRef<HTMLDivElement>(null);
  const monthButton = useRef<HTMLButtonElement>(null);
  const monthLayer = useStateLayer<HTMLButtonElement>();
  const monthRef = useMergedRef(monthButton, monthLayer.controlRef);
  /** Moves the DOM focus to the day that has it, once it has rendered. */
  const focusDay = useRef(false);
  const focusYear = useRef(false);
  const focusMonthButton = useRef(false);

  const disabled = useCallback(
    (date: Date) =>
      (min !== undefined && compareDays(date, min) < 0) ||
      (max !== undefined && compareDays(date, max) > 0) ||
      isDateDisabled?.(date) === true,
    [min, max, isDateDisabled],
  );

  const goToMonth = (next: Date) => {
    const target = startOfMonth(next);
    if (isSameMonth(target, month)) return;
    setDirection(target > month ? 'next' : 'previous');
    setMonth(target);
  };

  /** Moves the focus to a day, turning to its month if it is not on show. */
  const moveTo = (date: Date) => {
    const target = clampDate(date, min, max);
    focusDay.current = true;
    setFocused(target);
    goToMonth(target);
  };

  /** The nav buttons turn the month and take the day that has the focus with them. */
  const turn = (by: number) => {
    setFocused((current) => clampDate(addMonths(current, by), min, max));
    goToMonth(addMonths(month, by));
  };

  const choose = (date: Date) => {
    if (disabled(date)) return;
    setFocused(date);
    goToMonth(date);
    onSelect(date);
  };

  useLayoutEffect(() => {
    if (focusDay.current && view === 'days') {
      focusDay.current = false;
      grid.current?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus();
    }
    if (focusMonthButton.current) {
      focusMonthButton.current = false;
      monthButton.current?.focus();
    }
    if (view === 'years') {
      const list = yearList.current;
      const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (list && selected) {
        // Centre the year on show, without scrolling the page.
        list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
        if (focusYear.current) {
          focusYear.current = false;
          selected.focus({ preventScroll: true });
        }
      }
    }
  });

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
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
    moveTo(next);
  };

  const names = useMemo(() => weekdayNames(locale, weekStart), [locale, weekStart]);
  const weeks = useMemo(
    () => monthGrid(month.getFullYear(), month.getMonth(), weekStart),
    [month, weekStart],
  );
  const monthName = formatter(locale, { month: 'long', year: 'numeric' }).format(month);

  const canGoBack = !min || compareDays(addDays(month, -1), min) >= 0;
  const canGoForward = !max || compareDays(addMonths(month, 1), max) <= 0;

  // The day that holds the tab stop: the focused one when it is on show, else the first of the month.
  const tabStop = isSameMonth(focused, month) ? focused : clampDate(month, min, max);

  return (
    <div className={styles.calendar} data-view={view} data-variant={variant}>
      <div className={styles.toolbar}>
        <button
          ref={monthRef}
          type="button"
          className={styles.monthButton}
          aria-label={`${monthName}, ${labels.selectYear}`}
          aria-expanded={view === 'years'}
          aria-controls={view === 'years' ? ids.years : undefined}
          onClick={() => {
            if (view === 'days') focusYear.current = true;
            setView(view === 'days' ? 'years' : 'days');
          }}
        >
          <StateLayer ref={monthLayer.surfaceRef} />
          <span id={ids.label} aria-live="polite" aria-atomic="true">
            {monthName}
          </span>
          <span className={styles.monthIcon} aria-hidden="true">
            <DropDown />
          </span>
        </button>
        {view === 'days' ? (
          <div className={styles.arrows}>
            <IconButton
              aria-label={labels.previousMonth}
              disabled={!canGoBack}
              onClick={() => turn(-1)}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              aria-label={labels.nextMonth}
              disabled={!canGoForward}
              onClick={() => turn(1)}
            >
              <ChevronRight />
            </IconButton>
          </div>
        ) : null}
        {toolbarEnd}
      </div>

      {view === 'days' ? (
        <div
          key={`${month.getFullYear()}-${month.getMonth()}`}
          className={styles.month}
          data-direction={direction}
        >
          <table
            ref={grid}
            className={styles.grid}
            // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a table of days with the arrow keys moving between them is an ARIA grid, as in the APG date picker.
            role="grid"
            aria-labelledby={ids.label}
            onKeyDown={onGridKeyDown}
          >
            <thead>
              <tr>
                {names.map((name) => (
                  <th key={name.long} scope="col" abbr={name.long} className={styles.weekday}>
                    <span aria-hidden="true">{name.narrow}</span>
                    <span className={visuallyHidden.visuallyHidden}>{name.long}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]?.getTime()}>
                  {week.map((date) => {
                    const outside = date.getMonth() !== month.getMonth();
                    return (
                      <DayCell
                        key={date.getTime()}
                        date={date}
                        locale={locale}
                        hidden={outside && variant === 'modal'}
                        outside={outside}
                        selected={isSameDay(date, value)}
                        today={isSameDay(date, today)}
                        disabled={disabled(date)}
                        tabStop={isSameDay(date, tabStop)}
                        onChoose={choose}
                        onFocused={setFocused}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <YearGrid
          ref={yearList}
          id={ids.years}
          label={labels.years}
          selectedYear={month.getFullYear()}
          currentYear={today.getFullYear()}
          from={(min ?? addMonths(today, -1200)).getFullYear()}
          to={(max ?? addMonths(today, 1200)).getFullYear()}
          onChoose={(year) => {
            // The same month and day of the year chosen, kept to the days that year has.
            const by = (year - month.getFullYear()) * 12;
            setFocused((current) => clampDate(addMonths(current, by), min, max));
            goToMonth(clampDate(addMonths(month, by), min, max));
            focusDay.current = true;
            setView('days');
          }}
          onLeave={() => {
            focusMonthButton.current = true;
            setView('days');
          }}
        />
      )}
    </div>
  );
}

interface DayCellProps {
  date: Date;
  locale: string | undefined;
  hidden: boolean;
  outside: boolean;
  selected: boolean;
  today: boolean;
  disabled: boolean;
  tabStop: boolean;
  onChoose: (date: Date) => void;
  onFocused: (date: Date) => void;
}

/** One day: a button in a grid cell. Memoised, because a month has up to 42 and they rarely change. */
const DayCell = memo(function DayCell({
  date,
  locale,
  hidden,
  outside,
  selected,
  today,
  disabled,
  tabStop,
  onChoose,
  onFocused,
}: DayCellProps) {
  const { controlRef, surfaceRef } = useStateLayer<HTMLButtonElement>({ disabled });
  if (hidden) return <td className={styles.cell} aria-hidden="true" />;
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a day is a cell of the grid, as in the APG date picker; `aria-selected` belongs on it.
    // biome-ignore lint/a11y/useFocusableInteractive: the focusable control is the button inside the cell, which is the one tab stop.
    <td className={styles.cell} role="gridcell" aria-selected={selected}>
      <button
        ref={controlRef}
        type="button"
        className={styles.day}
        tabIndex={tabStop ? 0 : -1}
        aria-label={formatter(locale, { dateStyle: 'full' }).format(date)}
        aria-current={today ? 'date' : undefined}
        aria-disabled={disabled || undefined}
        data-selected={selected ? '' : undefined}
        data-today={today ? '' : undefined}
        data-outside={outside ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        onClick={() => onChoose(date)}
        onFocus={() => onFocused(date)}
      >
        <StateLayer ref={surfaceRef} />
        <span aria-hidden="true">{date.getDate()}</span>
      </button>
    </td>
  );
});

interface YearGridProps {
  ref: React.Ref<HTMLDivElement>;
  id: string;
  label: string;
  selectedYear: number;
  currentYear: number;
  from: number;
  to: number;
  onChoose: (year: number) => void;
  /** Escape: back to the days. */
  onLeave: () => void;
}

/** The years, three to a row, in a list that scrolls. */
function YearGrid({
  ref,
  id,
  label,
  selectedYear,
  currentYear,
  from,
  to,
  onChoose,
  onLeave,
}: YearGridProps) {
  const years = useMemo(
    () => Array.from({ length: Math.max(to - from + 1, 1) }, (_, index) => from + index),
    [from, to],
  );
  const own = useRef<HTMLDivElement | null>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onLeave();
      return;
    }
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const step = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -3, ArrowDown: 3 }[
      event.key
    ];
    const current = document.activeElement as HTMLElement | null;
    const year = Number(current?.dataset.year);
    if (!step || Number.isNaN(year)) return;
    event.preventDefault();
    const target = Math.min(Math.max(year + step, from), to);
    own.current?.querySelector<HTMLElement>(`[data-year="${target}"]`)?.focus();
  };

  return (
    <div
      ref={(node) => {
        own.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
      }}
      id={id}
      role="listbox"
      aria-label={label}
      className={styles.years}
      onKeyDown={onKeyDown}
    >
      {years.map((year) => (
        <YearOption
          key={year}
          year={year}
          selected={year === selectedYear}
          current={year === currentYear}
          onChoose={onChoose}
        />
      ))}
    </div>
  );
}

const YearOption = memo(function YearOption({
  year,
  selected,
  current,
  onChoose,
}: {
  year: number;
  selected: boolean;
  current: boolean;
  onChoose: (year: number) => void;
}) {
  const { controlRef, surfaceRef } = useStateLayer<HTMLButtonElement>();
  return (
    <button
      ref={controlRef}
      type="button"
      role="option"
      className={styles.year}
      aria-selected={selected}
      // The selected year is the one tab stop; the rest are reached with the arrow keys.
      tabIndex={selected ? 0 : -1}
      data-year={year}
      data-selected={selected ? '' : undefined}
      data-current={current ? '' : undefined}
      onClick={() => onChoose(year)}
    >
      <StateLayer ref={surfaceRef} />
      <span>{year}</span>
    </button>
  );
});
