'use client';

import { memo } from 'react';
import { StateLayer } from '../foundation/state-layer.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import { formatter } from './date-utils.js';
import styles from './day-cell.module.css';

/** Where a day is in a chosen range: an end of it, between the ends, or the whole of it. */
export type RangePart = 'start' | 'end' | 'middle' | 'single';

export interface DayCellProps {
  date: Date;
  locale: string | undefined;
  /** Leaves the cell empty: a day of a neighbouring month in a picker that does not show them. */
  hidden: boolean;
  outside: boolean;
  selected: boolean;
  today: boolean;
  disabled: boolean;
  tabStop: boolean;
  /** Which part of a chosen range the day is, if it is in one. */
  range?: RangePart | undefined;
  /** Whether the day is the first or last of its week, where a range's band is capped. */
  edge?: 'start' | 'end' | undefined;
  onChoose: (date: Date) => void;
  onFocused: (date: Date) => void;
}

/** A day as `year-month-day`, for finding its button. */
export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

/** One day: a button in a grid cell. Memoised, because a month has up to 42 and they rarely change. */
export const DayCell = memo(function DayCell({
  date,
  locale,
  hidden,
  outside,
  selected,
  today,
  disabled,
  tabStop,
  range,
  edge,
  onChoose,
  onFocused,
}: DayCellProps) {
  const { controlRef, surfaceRef } = useStateLayer<HTMLButtonElement>({ disabled });
  if (hidden) return <td className={styles.cell} aria-hidden="true" />;
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: the focusable control is the button inside the cell, which is the one tab stop.
    <td
      className={styles.cell}
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a day is a cell of the grid, as in the APG date picker; `aria-selected` belongs on it.
      role="gridcell"
      aria-selected={selected}
      data-range={range}
      data-edge={edge}
    >
      <button
        ref={controlRef}
        type="button"
        className={styles.day}
        tabIndex={tabStop ? 0 : -1}
        aria-label={formatter(locale, { dateStyle: 'full' }).format(date)}
        aria-current={today ? 'date' : undefined}
        aria-disabled={disabled || undefined}
        data-date={dayKey(date)}
        data-selected={selected ? '' : undefined}
        data-in-range={range === 'middle' ? '' : undefined}
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
