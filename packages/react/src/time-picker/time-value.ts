/** A time of day, on a 24-hour clock whatever is shown. */
export interface TimeValue {
  /** 0 to 23. */
  hours: number;
  /** 0 to 59. */
  minutes: number;
}

export type HourCycle = 12 | 24;
export type TimeUnit = 'hours' | 'minutes';
export type DayPeriod = 'am' | 'pm';

export const periodOf = (hours: number): DayPeriod => (hours >= 12 ? 'pm' : 'am');

/** The hour as a 12-hour clock shows it: 1 to 12, with midnight and noon as 12. */
export const hourOf12 = (hours: number) => (hours % 12 === 0 ? 12 : hours % 12);

/** The 24-hour hour for a 12-hour one (1 to 12) in a period. */
export const hourFrom12 = (hour: number, period: DayPeriod) =>
  (hour % 12) + (period === 'pm' ? 12 : 0);

/** What an hour reads as: unpadded on a 12-hour clock, two digits on a 24-hour one. */
export const formatHour = (hours: number, cycle: HourCycle) =>
  cycle === 12 ? String(hourOf12(hours)) : String(hours).padStart(2, '0');

export const formatMinute = (minutes: number) => String(minutes).padStart(2, '0');
