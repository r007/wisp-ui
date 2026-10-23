import { expect, test } from 'vitest';
import {
  addDays,
  addMonths,
  clampDate,
  compareDays,
  dateFormat,
  daysInMonth,
  firstDayOfWeek,
  formatDigits,
  isSameDay,
  monthGrid,
  parseDate,
  startOfDay,
  weekdayNames,
} from './date-utils.js';

const d = (year: number, month: number, day: number) => new Date(year, month - 1, day);
const ymd = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

test('knows how many days a month has, leap years included', () => {
  expect(daysInMonth(2026, 0)).toBe(31);
  expect(daysInMonth(2026, 1)).toBe(28);
  expect(daysInMonth(2024, 1)).toBe(29);
  expect(daysInMonth(1900, 1)).toBe(28);
  expect(daysInMonth(2000, 1)).toBe(29);
  expect(daysInMonth(2026, 3)).toBe(30);
});

test('adds days across month and year ends, and backwards', () => {
  expect(ymd(addDays(d(2026, 1, 31), 1))).toBe('2026-2-1');
  expect(ymd(addDays(d(2026, 12, 31), 1))).toBe('2027-1-1');
  expect(ymd(addDays(d(2026, 3, 1), -1))).toBe('2026-2-28');
  expect(ymd(addDays(d(2024, 2, 28), 2))).toBe('2024-3-1');
});

test('adds days across a daylight saving change without drifting off the day', () => {
  // Whatever the time zone, a day added to a day is the next day at midnight.
  for (const start of [d(2026, 3, 7), d(2026, 3, 28), d(2026, 10, 24), d(2026, 11, 1)]) {
    for (let step = 1; step <= 3; step++) {
      const next = addDays(start, step);
      expect([next.getHours(), next.getMinutes()]).toEqual([0, 0]);
      expect(compareDays(next, start)).toBeGreaterThan(0);
    }
  }
});

test('adds months, keeping the day where the month has it and clamping where it does not', () => {
  expect(ymd(addMonths(d(2026, 1, 15), 1))).toBe('2026-2-15');
  expect(ymd(addMonths(d(2026, 1, 31), 1))).toBe('2026-2-28');
  expect(ymd(addMonths(d(2024, 1, 31), 1))).toBe('2024-2-29');
  expect(ymd(addMonths(d(2026, 3, 31), -1))).toBe('2026-2-28');
  expect(ymd(addMonths(d(2026, 12, 15), 1))).toBe('2027-1-15');
  expect(ymd(addMonths(d(2026, 1, 15), -1))).toBe('2025-12-15');
  expect(ymd(addMonths(d(2026, 5, 31), 12))).toBe('2027-5-31');
});

test('compares days by the day, whatever the time', () => {
  const morning = new Date(2026, 5, 1, 8, 0);
  const night = new Date(2026, 5, 1, 23, 59);
  expect(isSameDay(morning, night)).toBe(true);
  expect(compareDays(morning, night)).toBe(0);
  expect(compareDays(d(2026, 5, 31), night)).toBeLessThan(0);
  expect(compareDays(d(2026, 6, 2), night)).toBeGreaterThan(0);
  expect(isSameDay(null, night)).toBe(false);
  expect(isSameDay(morning, undefined)).toBe(false);
});

test('clamps a date to a range, to local midnight', () => {
  const min = d(2026, 6, 10);
  const max = d(2026, 6, 20);
  expect(ymd(clampDate(d(2026, 6, 1), min, max))).toBe('2026-6-10');
  expect(ymd(clampDate(d(2026, 7, 1), min, max))).toBe('2026-6-20');
  expect(ymd(clampDate(d(2026, 6, 15), min, max))).toBe('2026-6-15');
  expect(ymd(clampDate(d(2026, 6, 1), undefined, undefined))).toBe('2026-6-1');
  expect(clampDate(new Date(2026, 5, 15, 13, 30)).getHours()).toBe(0);
  expect(startOfDay(new Date(2026, 5, 15, 13, 30)).getTime()).toBe(d(2026, 6, 15).getTime());
});

test.describe('the month grid', () => {
  test('starts on the week start and fills out whole weeks', () => {
    // June 2026 starts on a Monday.
    const sunday = monthGrid(2026, 5, 0);
    expect(sunday).toHaveLength(5);
    expect(ymd(sunday[0]?.[0] as Date)).toBe('2026-5-31');
    expect(ymd(sunday[0]?.[1] as Date)).toBe('2026-6-1');
    expect(ymd(sunday.at(-1)?.at(-1) as Date)).toBe('2026-7-4');
    const monday = monthGrid(2026, 5, 1);
    expect(monday).toHaveLength(5);
    expect(ymd(monday[0]?.[0] as Date)).toBe('2026-6-1');
    expect(ymd(monday.at(-1)?.at(-1) as Date)).toBe('2026-7-5');
  });

  test('has four rows when February begins on the week start and has 28 days', () => {
    // February 2026 starts on a Sunday and has 28 days: exactly four weeks.
    const grid = monthGrid(2026, 1, 0);
    expect(grid).toHaveLength(4);
    expect(ymd(grid[0]?.[0] as Date)).toBe('2026-2-1');
    expect(ymd(grid[3]?.[6] as Date)).toBe('2026-2-28');
  });

  test('has six rows when a long month starts late in the week', () => {
    // August 2026 starts on a Saturday and has 31 days.
    const grid = monthGrid(2026, 7, 0);
    expect(grid).toHaveLength(6);
    expect(ymd(grid[0]?.[0] as Date)).toBe('2026-7-26');
    expect(ymd(grid[0]?.[6] as Date)).toBe('2026-8-1');
  });

  test('always has seven days a row, each a day on from the last', () => {
    for (const [year, month] of [
      [2026, 0],
      [2026, 1],
      [2024, 1],
      [2026, 11],
      [2027, 5],
    ] as const) {
      for (const weekStart of [0, 1, 6]) {
        const grid = monthGrid(year, month, weekStart);
        const flat = grid.flat();
        expect(flat.length % 7).toBe(0);
        expect(grid.every((row) => row.length === 7)).toBe(true);
        for (let index = 1; index < flat.length; index++) {
          expect(compareDays(flat[index] as Date, flat[index - 1] as Date)).toBeGreaterThan(0);
          expect(ymd(flat[index] as Date)).toBe(ymd(addDays(flat[index - 1] as Date, 1)));
        }
        expect((flat[0] as Date).getDay()).toBe(weekStart);
        // Every day of the month is in it, once.
        expect(flat.filter((day) => day.getMonth() === month)).toHaveLength(
          daysInMonth(year, month),
        );
      }
    }
  });
});

test('names the weekdays from the week start', () => {
  const sunday = weekdayNames('en-US', 0);
  expect(sunday.map((day) => day.narrow)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  expect(sunday.map((day) => day.long)[0]).toBe('Sunday');
  const monday = weekdayNames('en-US', 1);
  expect(monday.map((day) => day.long)).toEqual([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]);
  expect(weekdayNames('de', 1)[0]?.long).toBe('Montag');
});

test('knows which day a locale starts its week on', () => {
  expect(firstDayOfWeek('en-US')).toBe(0);
  expect(firstDayOfWeek('en-GB')).toBe(1);
  expect(firstDayOfWeek('de-DE')).toBe(1);
  expect(firstDayOfWeek('fr-FR')).toBe(1);
  expect(firstDayOfWeek('ja-JP')).toBe(0);
  expect(firstDayOfWeek('xx-nope-not-a-locale')).toBeGreaterThanOrEqual(0);
});

test.describe('typing a date', () => {
  test('reads how a locale writes one', () => {
    expect(dateFormat('en-US')).toEqual({
      order: ['month', 'day', 'year'],
      separator: '/',
      hint: 'mm/dd/yyyy',
    });
    expect(dateFormat('en-GB').hint).toBe('dd/mm/yyyy');
    expect(dateFormat('de-DE').hint).toBe('dd.mm.yyyy');
    expect(dateFormat('sv-SE').order).toEqual(['year', 'month', 'day']);
  });

  test('parses a date in the locale’s order', () => {
    const us = dateFormat('en-US').order;
    const gb = dateFormat('en-GB').order;
    const iso = dateFormat('sv-SE').order;
    expect(ymd(parseDate('10/23/2026', us) as Date)).toBe('2026-10-23');
    expect(ymd(parseDate('23/10/2026', gb) as Date)).toBe('2026-10-23');
    expect(ymd(parseDate('2026-10-23', iso) as Date)).toBe('2026-10-23');
    expect(ymd(parseDate(' 1.2.2026 ', us) as Date)).toBe('2026-1-2');
    expect(ymd(parseDate('1 2 2026', us) as Date)).toBe('2026-1-2');
  });

  test('takes a two-digit year as this century’s', () => {
    expect(ymd(parseDate('10/23/26', dateFormat('en-US').order) as Date)).toBe('2026-10-23');
  });

  test('refuses what is not a date, including a day the month does not have', () => {
    const us = dateFormat('en-US').order;
    for (const text of [
      '',
      '10/23',
      '10/23/2026/1',
      'a/b/c',
      '13/01/2026',
      '02/30/2026',
      '00/10/2026',
      '10/00/2026',
      '10/23/202',
      '10/23/20266',
      '10x23x2026',
    ]) {
      expect(parseDate(text, us), text).toBeNull();
    }
    // 29 February only in a leap year.
    expect(parseDate('02/29/2024', us)).not.toBeNull();
    expect(parseDate('02/29/2026', us)).toBeNull();
  });

  test('writes a date as digits and reads it back', () => {
    for (const locale of ['en-US', 'en-GB', 'de-DE', 'sv-SE']) {
      const date = d(2026, 3, 7);
      const text = formatDigits(date, locale);
      expect(ymd(parseDate(text, dateFormat(locale).order) as Date), locale).toBe('2026-3-7');
    }
    expect(formatDigits(d(2026, 3, 7), 'en-US')).toBe('03/07/2026');
    expect(formatDigits(d(2026, 3, 7), 'de-DE')).toBe('07.03.2026');
  });
});
