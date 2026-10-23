/**
 * Calendar arithmetic and formatting for the date pickers. A date is a `Date` read in the local
 * time zone and only ever as a day: every function here returns local midnight, so a time of
 * day (or a daylight-saving change) cannot move a date to its neighbour.
 */

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** Months on, keeping the day of the month where the month has it (31 January + 1 is 28 February). */
export function addMonths(date: Date, months: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const day = Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
  return new Date(target.getFullYear(), target.getMonth(), day);
}

export const isSameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Negative when `a` is the earlier day, zero for the same day. */
export const compareDays = (a: Date, b: Date) =>
  new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() -
  new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();

/** The date held within `min` and `max`, either of which may be missing. */
export function clampDate(date: Date, min?: Date, max?: Date) {
  if (min && compareDays(date, min) < 0) return startOfDay(min);
  if (max && compareDays(date, max) > 0) return startOfDay(max);
  return startOfDay(date);
}

/** Regions whose week starts on a Sunday (the rest start on a Monday), per CLDR. */
const SUNDAY_FIRST = new Set(
  (
    'AG AS AU BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT ' +
    'MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'
  ).split(' '),
);

/**
 * The day a week starts on in a locale, 0 for Sunday to 6 for Saturday. Browsers that know the
 * locale's week (`Intl.Locale#getWeekInfo`) say so; for the others it comes from the region.
 */
export function firstDayOfWeek(locale?: string): number {
  try {
    const intl = new Intl.Locale(locale ?? navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = intl.getWeekInfo?.() ?? intl.weekInfo;
    // 1 is Monday and 7 is Sunday there.
    if (info) return info.firstDay % 7;
    const region = intl.region ?? intl.maximize().region;
    return region && SUNDAY_FIRST.has(region) ? 0 : 1;
  } catch {
    return 0;
  }
}

/**
 * The weeks that show a month, each a row of seven days starting on `weekStart`, including the
 * days of the neighbouring months that fill the first and last rows.
 */
export function monthGrid(year: number, month: number, weekStart: number): Date[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const rows = Math.ceil((lead + daysInMonth(year, month)) / 7);
  const start = addDays(first, -lead);
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => addDays(start, row * 7 + column)),
  );
}

const formatters = new Map<string, Intl.DateTimeFormat>();
/** A cached `Intl.DateTimeFormat`, since making one is slow and a calendar makes many labels. */
export function formatter(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, format);
  }
  return format;
}

/** The seven weekday names in the order a week shows them, short for the column, long for speech. */
export function weekdayNames(locale: string | undefined, weekStart: number) {
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(2023, 0, 1 + ((weekStart + index) % 7));
    return {
      narrow: formatter(locale, { weekday: 'narrow' }).format(day),
      long: formatter(locale, { weekday: 'long' }).format(day),
    };
  });
}

/** How a locale writes a date as digits, for typing one: the order of its parts and what divides them. */
export function dateFormat(locale?: string) {
  const parts = formatter(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(2000, 10, 22));
  const order = parts
    .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
    .map((part) => part.type as 'year' | 'month' | 'day');
  const separator = parts.find((part) => part.type === 'literal')?.value.trim() || '/';
  const letters = { year: 'yyyy', month: 'mm', day: 'dd' } as const;
  return { order, separator, hint: order.map((part) => letters[part]).join(separator) };
}

/** The date a person typed, in the order the locale writes it, or `null` when it is not a date. */
export function parseDate(text: string, order: ReturnType<typeof dateFormat>['order']) {
  // Digits, and the things that divide them in a date, and nothing else.
  if (!/^[\d\s./,-]+$/.test(text)) return null;
  const parts = text.trim().split(/\D+/).filter(Boolean);
  if (parts.length !== 3) return null;
  const read = { year: 0, month: 0, day: 0 };
  order.forEach((kind, index) => {
    read[kind] = Number(parts[index]);
  });
  // A two-digit year is this century's.
  if ((parts[order.indexOf('year')] ?? '').length <= 2) read.year += 2000;
  else if ((parts[order.indexOf('year')] ?? '').length !== 4) return null;
  const date = new Date(read.year, read.month - 1, read.day);
  // A date that rolled over (30 February) was not one.
  return date.getFullYear() === read.year &&
    date.getMonth() === read.month - 1 &&
    date.getDate() === read.day
    ? date
    : null;
}

/** A date as digits in a locale's order, for a text field. */
export function formatDigits(date: Date, locale?: string) {
  const { order, separator } = dateFormat(locale);
  const pad = (n: number, size: number) => String(n).padStart(size, '0');
  const value = {
    year: pad(date.getFullYear(), 4),
    month: pad(date.getMonth() + 1, 2),
    day: pad(date.getDate(), 2),
  };
  return order.map((part) => value[part]).join(separator);
}
