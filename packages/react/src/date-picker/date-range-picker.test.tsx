import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { DateRangePicker, type DateRangePickerProps } from './date-range-picker.js';
import { chooseInRange, type DateRange } from './range-calendar.js';

const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const day = (name: string) => page.getByRole('button', { name, exact: true });
const cellOf = (name: string) => day(name).element().closest('td') as HTMLElement;
const scroller = () => document.querySelector('[data-month]')?.parentElement as HTMLElement;
const ymd = (date: Date | null | undefined) =>
  date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;
const rangeOf = (value: DateRange | undefined) => `${ymd(value?.start)} to ${ymd(value?.end)}`;
const focusedLabel = () => document.activeElement?.getAttribute('aria-label');

const TODAY = new Date(2026, 9, 14);
const d = (month: number, date: number, year = 2026) => new Date(year, month - 1, date);

test.describe('choosing a range', () => {
  const none: DateRange = { start: null, end: null };

  test('the first day starts one, the second ends it', () => {
    const started = chooseInRange(none, d(10, 5));
    expect(rangeOf(started)).toBe('2026-10-5 to null');
    expect(rangeOf(chooseInRange(started, d(10, 12)))).toBe('2026-10-5 to 2026-10-12');
  });

  test('the same day twice is a range of one day', () => {
    expect(rangeOf(chooseInRange({ start: d(10, 5), end: null }, d(10, 5)))).toBe(
      '2026-10-5 to 2026-10-5',
    );
  });

  test('a day before the start starts a new range instead', () => {
    expect(rangeOf(chooseInRange({ start: d(10, 5), end: null }, d(10, 2)))).toBe(
      '2026-10-2 to null',
    );
  });

  test('a day chosen once the range is whole starts a new one, whichever side of it', () => {
    const whole = { start: d(10, 5), end: d(10, 12) };
    expect(rangeOf(chooseInRange(whole, d(10, 20)))).toBe('2026-10-20 to null');
    expect(rangeOf(chooseInRange(whole, d(10, 8)))).toBe('2026-10-8 to null');
    expect(rangeOf(chooseInRange(whole, d(9, 30)))).toBe('2026-9-30 to null');
  });
});

function Sample(props: Partial<DateRangePickerProps>) {
  return (
    <DateRangePicker
      today={TODAY}
      locale="en-US"
      firstDayOfWeek={0}
      min={d(9, 1)}
      max={d(12, 31)}
      style={{ blockSize: 480 }}
      {...props}
    />
  );
}

test.describe('the months', () => {
  test('are one grid each under a subhead, from the month of min to the month of max', async () => {
    await render(<Sample defaultValue={{ start: null, end: null }} />);
    const grids = page.getByRole('grid').elements();
    expect(grids).toHaveLength(4);
    const subheads = page
      .getByRole('heading', { level: 3 })
      .elements()
      .map((h) => h.textContent);
    expect(subheads).toEqual(['September 2026', 'October 2026', 'November 2026', 'December 2026']);
    expect(grids[1]).toHaveAttribute('aria-multiselectable', 'true');
    expect(grids[1]).toHaveAccessibleName('October 2026');
  });

  test('run from a year before today to three after when there is no min or max', async () => {
    await render(
      <Sample min={undefined} max={undefined} defaultValue={{ start: null, end: null }} />,
    );
    const subheads = page.getByRole('heading', { level: 3 }).elements();
    expect(subheads[0]?.textContent).toBe('October 2025');
    expect(subheads.at(-1)?.textContent).toBe('October 2029');
    expect(subheads).toHaveLength(49);
  });

  test('keep the weekday names above them, whatever is scrolled', async () => {
    await render(<Sample defaultValue={{ start: null, end: null }} />);
    const names = page.getByRole('columnheader').elements();
    // Each month has a (hidden) header row for a screen reader; the visible row is aria-hidden.
    expect(names.length).toBeGreaterThan(0);
    expect(names.slice(0, 7).map((n) => n.textContent)).toEqual([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]);
  });

  test('start the week where it is told to', async () => {
    await render(<Sample firstDayOfWeek={1} defaultValue={{ start: null, end: null }} />);
    expect(page.getByRole('columnheader').elements()[0]?.textContent).toBe('Monday');
  });

  test('open on the month the range starts in', async () => {
    await render(<Sample defaultValue={{ start: d(11, 18), end: d(11, 20) }} />);
    const list = scroller();
    await expect.poll(() => list.scrollTop).toBeGreaterThan(0);
    const november = list.querySelector('[data-month="2026-10"]') as HTMLElement;
    await expect.poll(() => Math.abs(rect(november).top - rect(list).top)).toBeLessThan(2);
  });

  test('draw only when they are on show, with room kept for the ones that are not', async () => {
    await render(<Sample defaultValue={{ start: null, end: null }} />);
    const month = document.querySelector('[data-month]') as HTMLElement;
    expect(style(month).contentVisibility).toBe('auto');
  });

  test('name every day in full, and only the days of their own month', async () => {
    await render(<Sample defaultValue={{ start: null, end: null }} />);
    await expect.element(day('Friday, October 23, 2026')).toBeVisible();
    // 31 days of October, in October's grid; the blanks either side are not days.
    const october = document.querySelector('[data-month="2026-9"]') as HTMLElement;
    expect(october.querySelectorAll('button')).toHaveLength(31);
  });
});

test.describe('choosing days', () => {
  test('starts a range with a press, and ends it with a second', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await userEvent.click(day('Monday, October 5, 2026'));
    expect(rangeOf(onValueChange.mock.lastCall?.[0])).toBe('2026-10-5 to null');
    await userEvent.click(day('Monday, October 12, 2026'));
    expect(rangeOf(onValueChange.mock.lastCall?.[0])).toBe('2026-10-5 to 2026-10-12');
  });

  test('works across a month', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await userEvent.click(day('Friday, October 30, 2026'));
    await userEvent.click(day('Tuesday, November 3, 2026'));
    expect(rangeOf(onValueChange.mock.lastCall?.[0])).toBe('2026-10-30 to 2026-11-3');
  });

  test('restarts on a day before the start, and once the range is whole', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await userEvent.click(day('Monday, October 12, 2026'));
    await userEvent.click(day('Monday, October 5, 2026'));
    expect(rangeOf(onValueChange.mock.lastCall?.[0])).toBe('2026-10-5 to null');
    await userEvent.click(day('Friday, October 9, 2026'));
    await userEvent.click(day('Monday, October 19, 2026'));
    expect(rangeOf(onValueChange.mock.lastCall?.[0])).toBe('2026-10-19 to null');
  });

  test('follows a value it is given, and stays put until the parent changes it', async () => {
    const onValueChange = vi.fn();
    await render(
      <Sample
        value={{ start: d(10, 5), end: d(10, 7) }}
        defaultValue={undefined}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(day('Monday, October 19, 2026'));
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(cellOf('Monday, October 5, 2026')).toHaveAttribute('data-range', 'start');
  });

  test('refuses days outside min and max, and ones isDateDisabled rules out', async () => {
    const onValueChange = vi.fn();
    await render(
      <Sample
        onValueChange={onValueChange}
        min={d(10, 6)}
        max={d(10, 28)}
        isDateDisabled={(date) => date.getDay() === 0}
        defaultValue={{ start: null, end: null }}
      />,
    );
    for (const name of ['Sunday, October 11, 2026', 'Thursday, October 29, 2026']) {
      expect(day(name).element()).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(day(name), { force: true });
    }
    expect(onValueChange).not.toHaveBeenCalled();
    expect(day('Monday, October 12, 2026').element()).not.toHaveAttribute('aria-disabled');
  });
});

test.describe('the band', () => {
  const range = { start: d(10, 21), end: d(11, 3) };

  test('marks the ends, the days between, and a single day', async () => {
    await render(<Sample defaultValue={range} />);
    expect(cellOf('Wednesday, October 21, 2026')).toHaveAttribute('data-range', 'start');
    expect(cellOf('Thursday, October 22, 2026')).toHaveAttribute('data-range', 'middle');
    expect(cellOf('Sunday, November 1, 2026')).toHaveAttribute('data-range', 'middle');
    expect(cellOf('Tuesday, November 3, 2026')).toHaveAttribute('data-range', 'end');
    expect(cellOf('Wednesday, November 4, 2026')).not.toHaveAttribute('data-range');
    expect(cellOf('Tuesday, October 20, 2026')).not.toHaveAttribute('data-range');
  });

  test('fills the ends like a chosen day, and leaves the days between unfilled', async () => {
    await render(<Sample defaultValue={range} />);
    const start = day('Wednesday, October 21, 2026').element();
    await expect.poll(() => style(start).backgroundColor).toBe('rgb(103, 80, 164)');
    expect(style(start).color).toBe('rgb(255, 255, 255)');
    expect(cellOf('Wednesday, October 21, 2026')).toHaveAttribute('aria-selected', 'true');
    const between = day('Thursday, October 22, 2026').element();
    expect(style(between).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(cellOf('Thursday, October 22, 2026')).toHaveAttribute('aria-selected', 'false');
  });

  test('draws a secondary-container band 40px tall behind the days between', async () => {
    await render(<Sample defaultValue={range} />);
    const band = style(cellOf('Thursday, October 22, 2026'), '::before');
    expect(band.backgroundColor).toBe('rgb(232, 222, 248)');
    expect(band.height).toBe('40px');
    expect(band.content).toBe('""');
  });

  test('labels the days between in on-secondary-container', async () => {
    await render(<Sample defaultValue={range} />);
    expect(style(day('Thursday, October 22, 2026').element()).color).toBe('rgb(74, 68, 88)');
  });

  test('runs the band from the middle of the first day to the middle of the last', async () => {
    await render(<Sample defaultValue={range} />);
    const bandBox = (name: string) => {
      const cell = cellOf(name);
      const band = style(cell, '::before');
      return {
        left: Number.parseFloat(band.left),
        width: Number.parseFloat(band.width),
        cell: rect(cell).width,
      };
    };
    const start = bandBox('Wednesday, October 21, 2026');
    expect(Math.round(start.left)).toBe(Math.round(start.cell / 2));
    expect(Math.round(start.width)).toBe(Math.round(start.cell / 2));
    const end = bandBox('Tuesday, November 3, 2026');
    expect(Math.round(end.left)).toBe(0);
    expect(Math.round(end.width)).toBe(Math.round(end.cell / 2));
    const middle = bandBox('Thursday, October 22, 2026');
    expect(Math.round(middle.width)).toBe(Math.round(middle.cell));
  });

  test('caps the band with a round end where a week ends inside the range', async () => {
    await render(<Sample defaultValue={range} />);
    // Saturday 24 October ends a week, Sunday 25 starts one: both are inside the range.
    const radius = (name: string, corner: 'borderTopLeftRadius' | 'borderTopRightRadius') =>
      Number.parseFloat(style(cellOf(name), '::before')[corner]);
    expect(radius('Saturday, October 24, 2026', 'borderTopRightRadius')).toBeGreaterThan(10);
    expect(radius('Saturday, October 24, 2026', 'borderTopLeftRadius')).toBe(0);
    expect(radius('Sunday, October 25, 2026', 'borderTopLeftRadius')).toBeGreaterThan(10);
    expect(radius('Sunday, October 25, 2026', 'borderTopRightRadius')).toBe(0);
    // A day in the middle of a week is square.
    expect(radius('Thursday, October 22, 2026', 'borderTopLeftRadius')).toBe(0);
  });

  test('draws a range of one day as a day, with no band', async () => {
    await render(<Sample defaultValue={{ start: d(10, 21), end: d(10, 21) }} />);
    expect(cellOf('Wednesday, October 21, 2026')).toHaveAttribute('data-range', 'single');
    expect(style(cellOf('Wednesday, October 21, 2026'), '::before').display).toBe('none');
    await expect
      .poll(() => style(day('Wednesday, October 21, 2026').element()).backgroundColor)
      .toBe('rgb(103, 80, 164)');
  });

  test('draws a range that has only a start as that day alone', async () => {
    await render(<Sample defaultValue={{ start: d(10, 21), end: null }} />);
    expect(cellOf('Wednesday, October 21, 2026')).toHaveAttribute('data-range', 'single');
    expect(cellOf('Thursday, October 22, 2026')).not.toHaveAttribute('data-range');
  });

  test('keeps today outlined, in or out of the range', async () => {
    await render(<Sample defaultValue={{ start: d(10, 10), end: d(10, 20) }} />);
    const today = day('Wednesday, October 14, 2026').element();
    expect(style(today).boxShadow).toContain('rgb(103, 80, 164)');
    expect(cellOf('Wednesday, October 14, 2026')).toHaveAttribute('data-range', 'middle');
  });
});

test.describe('the keyboard', () => {
  const sample = () => <Sample defaultValue={{ start: d(10, 21), end: d(10, 23) }} />;

  test('has one tab stop: the start of the range', async () => {
    await render(sample());
    const stops = Array.from(document.querySelectorAll<HTMLElement>('button[aria-label]')).filter(
      (b) => b.tabIndex === 0,
    );
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAttribute('aria-label', 'Wednesday, October 21, 2026');
  });

  test('moves a day or a week at a time, across the months', async () => {
    await render(sample());
    day('Wednesday, October 21, 2026').element().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedLabel()).toBe('Thursday, October 22, 2026');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(focusedLabel()).toBe('Thursday, November 5, 2026');
    await userEvent.keyboard('{ArrowLeft}{ArrowUp}');
    expect(focusedLabel()).toBe('Wednesday, October 28, 2026');
  });

  test('scrolls a day that is off the screen into view when it takes the focus', async () => {
    await render(sample());
    const list = scroller();
    day('Wednesday, October 21, 2026').element().focus();
    await userEvent.keyboard('{PageDown}{PageDown}');
    expect(focusedLabel()).toBe('Monday, December 21, 2026');
    const target = document.activeElement as HTMLElement;
    await expect
      .poll(() => rect(target).top >= rect(list).top && rect(target).bottom <= rect(list).bottom)
      .toBe(true);
  });

  test('Home and End go to the ends of the week, Page Up and Down by a month, with Shift a year', async () => {
    await render(
      <Sample min={undefined} max={undefined} defaultValue={{ start: d(10, 21), end: null }} />,
    );
    day('Wednesday, October 21, 2026').element().focus();
    await userEvent.keyboard('{Home}');
    expect(focusedLabel()).toBe('Sunday, October 18, 2026');
    await userEvent.keyboard('{End}');
    expect(focusedLabel()).toBe('Saturday, October 24, 2026');
    await userEvent.keyboard('{PageUp}');
    expect(focusedLabel()).toBe('Thursday, September 24, 2026');
    await userEvent.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(focusedLabel()).toBe('Friday, September 24, 2027');
  });

  test('stops at the first and last month, and at min and max', async () => {
    await render(
      <Sample min={d(9, 10)} max={d(12, 20)} defaultValue={{ start: d(10, 21), end: null }} />,
    );
    day('Wednesday, October 21, 2026').element().focus();
    await userEvent.keyboard('{PageUp}{PageUp}{PageUp}');
    expect(focusedLabel()).toBe('Thursday, September 10, 2026');
    await userEvent.keyboard('{PageDown}{PageDown}{PageDown}{PageDown}');
    expect(focusedLabel()).toBe('Sunday, December 20, 2026');
  });

  test('chooses the focused day with Enter and Space, and the range follows', async () => {
    const onValueChange = vi.fn();
    await render(
      <Sample
        defaultValue={{ start: null, end: null }}
        today={d(10, 20)}
        onValueChange={onValueChange}
      />,
    );
    day('Tuesday, October 20, 2026').element().focus();
    await userEvent.keyboard('{Enter}');
    expect(rangeOf(onValueChange.mock.lastCall?.[0])).toBe('2026-10-20 to null');
    await userEvent.keyboard('{ArrowRight}{ArrowRight} ');
    expect(rangeOf(onValueChange.mock.lastCall?.[0])).toBe('2026-10-20 to 2026-10-22');
  });

  test('reverses the arrows in a right-to-left layout', async () => {
    await render(<div dir="rtl">{sample()}</div>);
    day('Wednesday, October 21, 2026').element().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedLabel()).toBe('Tuesday, October 20, 2026');
  });
});

test('names the months in the locale', async () => {
  await render(
    <Sample locale="de-DE" firstDayOfWeek={undefined} defaultValue={{ start: null, end: null }} />,
  );
  await expect.element(page.getByRole('heading', { name: 'Oktober 2026' })).toBeVisible();
  await expect.element(day('Freitag, 23. Oktober 2026')).toBeVisible();
});

test('forwards a ref, a class and props to its surface', async () => {
  let node: HTMLDivElement | null = null;
  const { container } = await render(
    <Sample
      className="mine"
      data-testid="range"
      ref={(el) => {
        node = el;
      }}
    />,
  );
  expect(node).toBe(container.firstElementChild);
  expect(node).toHaveClass('mine');
});

test('is a square, flat, filled surface 360px wide', async () => {
  const { container } = await render(<Sample />);
  const surface = container.firstElementChild as HTMLElement;
  expect(rect(surface).width).toBe(360);
  expect(style(surface).borderTopLeftRadius).toBe('0px');
  expect(/[1-9]\d*(?:\.\d+)?px/.test(style(surface).boxShadow)).toBe(false);
  expect(style(surface).backgroundColor).toBe('rgb(236, 230, 240)');
});

function Controlled() {
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  return (
    <>
      <output data-testid="range">{rangeOf(range)}</output>
      <Sample value={range} onValueChange={setRange} />
    </>
  );
}

test('works controlled, round by round', async () => {
  await render(<Controlled />);
  await userEvent.click(day('Monday, October 5, 2026'));
  await userEvent.click(day('Wednesday, October 7, 2026'));
  await expect.element(page.getByTestId('range')).toHaveTextContent('2026-10-5 to 2026-10-7');
  expect(cellOf('Tuesday, October 6, 2026')).toHaveAttribute('data-range', 'middle');
});
