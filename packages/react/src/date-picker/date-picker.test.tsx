import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { DatePicker, type DatePickerProps } from './date-picker.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const grid = () => page.getByRole('grid').element() as HTMLElement;
const days = () => Array.from(grid().querySelectorAll<HTMLButtonElement>('button'));
const day = (name: string) => page.getByRole('button', { name, exact: true });
const focusedLabel = () => document.activeElement?.getAttribute('aria-label');
const monthButton = () => page.getByRole('button', { name: /, Select year$/ });
const ymd = (date: Date | null | undefined) =>
  date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;

const TODAY = new Date(2026, 9, 14);
const CHOSEN = new Date(2026, 9, 23);

function Sample(props: Partial<DatePickerProps>) {
  return (
    <DatePicker defaultValue={CHOSEN} today={TODAY} locale="en-US" firstDayOfWeek={0} {...props} />
  );
}

test.describe('the month', () => {
  test('is a grid named by the month, with the weekdays as column headers', async () => {
    await render(<Sample />);
    await expect.element(page.getByRole('grid', { name: 'October 2026' })).toBeVisible();
    const headers = page.getByRole('columnheader').elements();
    expect(headers).toHaveLength(7);
    expect(headers.map((h) => h.textContent)).toEqual([
      'SSunday',
      'MMonday',
      'TTuesday',
      'WWednesday',
      'TThursday',
      'FFriday',
      'SSaturday',
    ]);
  });

  test('names every day in full, so a screen reader needs nothing more', async () => {
    await render(<Sample />);
    await expect.element(day('Friday, October 23, 2026')).toBeVisible();
    await expect.element(day('Thursday, October 1, 2026')).toBeVisible();
    expect(
      days()
        .map((d) => d.textContent)
        .slice(4, 7),
    ).toEqual(['1', '2', '3']);
  });

  test('starts the week on the day it is told to', async () => {
    await render(<Sample firstDayOfWeek={1} />);
    const headers = page.getByRole('columnheader').elements();
    expect(headers[0]?.textContent).toBe('MMonday');
    expect(headers[6]?.textContent).toBe('SSunday');
  });

  test('marks today, and the chosen day as selected', async () => {
    await render(<Sample />);
    expect(day('Wednesday, October 14, 2026').element()).toHaveAttribute('aria-current', 'date');
    expect(day('Friday, October 23, 2026').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(day('Saturday, October 24, 2026').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  test('has one tab stop: the chosen day', async () => {
    await render(<Sample />);
    expect(days().filter((d) => d.tabIndex === 0)).toHaveLength(1);
    expect(day('Friday, October 23, 2026').element()).toHaveAttribute('tabindex', '0');
  });

  test('has one tab stop on today when nothing is chosen', async () => {
    await render(<Sample defaultValue={null} />);
    expect(day('Wednesday, October 14, 2026').element()).toHaveAttribute('tabindex', '0');
  });

  test('docked shows the days of the months either side, dimmed, and they can be chosen', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    // October 2026 starts on a Thursday: 27 to 30 September fill the first row.
    expect(days()).toHaveLength(35);
    const september = day('Sunday, September 27, 2026').element();
    expect(style(september).opacity).toBe('0.38');
    expect(style(day('Friday, October 23, 2026').element()).opacity).toBe('1');
    await userEvent.click(day('Sunday, September 27, 2026'));
    expect(ymd(onValueChange.mock.lastCall?.[0])).toBe('2026-9-27');
    // And the calendar turned to the month the day is in.
    await expect.element(page.getByRole('grid', { name: 'September 2026' })).toBeVisible();
  });

  test('modal leaves the neighbouring days blank, so it has only the month’s days', async () => {
    await render(<Sample variant="modal" />);
    expect(days()).toHaveLength(31);
    expect(grid().querySelectorAll('td[aria-hidden="true"]')).toHaveLength(4);
  });
});

test.describe('appearance', () => {
  test('docked: 360px wide, 16px corners, surface-container-high, 48px cells and 40px days', async () => {
    const { container } = await render(<Sample />);
    const surface = container.firstElementChild as HTMLElement;
    expect(rect(surface).width).toBe(360);
    expect(px(style(surface).borderTopLeftRadius)).toBe(16);
    expect(style(surface).backgroundColor).toBe('rgb(236, 230, 240)');
    const cell = day('Friday, October 23, 2026').element().closest('td') as HTMLElement;
    expect(rect(cell).height).toBe(48);
    expect(rect(day('Friday, October 23, 2026').element()).width).toBe(40);
    expect(rect(day('Friday, October 23, 2026').element()).height).toBe(40);
    expect(style(day('Friday, October 23, 2026').element()).borderTopLeftRadius).toBe('50%');
  });

  test('modal: 28px corners and 40px cells', async () => {
    const { container } = await render(<Sample variant="modal" />);
    const surface = container.firstElementChild as HTMLElement;
    expect(px(style(surface).borderTopLeftRadius)).toBe(28);
    const cell = day('Friday, October 23, 2026').element().closest('td') as HTMLElement;
    expect(rect(cell).height).toBe(40);
  });

  test('fills the chosen day with primary and its label with on-primary', async () => {
    await render(<Sample />);
    const chosen = day('Friday, October 23, 2026').element();
    await expect.poll(() => style(chosen).backgroundColor).toBe('rgb(103, 80, 164)');
    expect(style(chosen).color).toBe('rgb(255, 255, 255)');
  });

  test('outlines today 1px in primary, with a primary label', async () => {
    await render(<Sample />);
    const today = day('Wednesday, October 14, 2026').element();
    expect(style(today).boxShadow).toContain('rgb(103, 80, 164)');
    expect(style(today).boxShadow).toContain('0px 0px 0px 1px inset');
    expect(style(today).color).toBe('rgb(103, 80, 164)');
    expect(style(today).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  test('draws today as filled, without its outline, when it is the chosen day', async () => {
    await render(<Sample defaultValue={TODAY} />);
    const today = day('Wednesday, October 14, 2026').element();
    await expect.poll(() => style(today).backgroundColor).toBe('rgb(103, 80, 164)');
    expect(style(today).boxShadow).toBe('none');
  });

  test('stretches a day’s touch target to the whole cell', async () => {
    await render(<Sample />);
    const target = day('Friday, October 23, 2026').element();
    const cell = target.closest('td') as HTMLElement;
    const box = rect(cell);
    // A press in the corner of the cell, well outside the 40px circle, still lands on the day.
    const at = document.elementFromPoint(box.left + 2, box.top + 2);
    expect(at).toBe(target);
  });
});

function Jumping() {
  const [value, setValue] = useState<Date | null>(CHOSEN);
  return (
    <>
      <button type="button" onClick={() => setValue(new Date(2027, 1, 3))}>
        Next year
      </button>
      <Sample value={value} onValueChange={setValue} />
    </>
  );
}

test.describe('choosing', () => {
  test('reports the day at local midnight, and selects it', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await userEvent.click(day('Monday, October 5, 2026'));
    const chosen = onValueChange.mock.lastCall?.[0] as Date;
    expect(ymd(chosen)).toBe('2026-10-5');
    expect([chosen.getHours(), chosen.getMinutes(), chosen.getSeconds()]).toEqual([0, 0, 0]);
    expect(day('Monday, October 5, 2026').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(day('Friday, October 23, 2026').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  test('stays on the value it is given until the parent changes it', async () => {
    const onValueChange = vi.fn();
    await render(<Sample value={CHOSEN} defaultValue={undefined} onValueChange={onValueChange} />);
    await userEvent.click(day('Monday, October 5, 2026'));
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(day('Friday, October 23, 2026').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('can start empty, and a `null` value is empty too', async () => {
    await render(<Sample defaultValue={null} />);
    expect(grid().querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
  });

  test('follows a value it is given, turning to its month', async () => {
    await render(<Jumping />);
    await userEvent.click(page.getByRole('button', { name: 'Next year' }));
    // It selects the day in the month on show; the calendar does not jump on its own.
    expect(ymd(new Date(2027, 1, 3))).toBe('2027-2-3');
    await expect.element(page.getByRole('grid', { name: 'October 2026' })).toBeVisible();
  });

  test('refuses a day before min, after max, or that isDateDisabled says no to', async () => {
    const onValueChange = vi.fn();
    await render(
      <Sample
        min={new Date(2026, 9, 6)}
        max={new Date(2026, 9, 28)}
        isDateDisabled={(date) => date.getDay() === 6}
        onValueChange={onValueChange}
      />,
    );
    for (const name of [
      'Sunday, October 4, 2026',
      'Thursday, October 29, 2026',
      'Saturday, October 10, 2026',
    ]) {
      expect(day(name).element()).toHaveAttribute('aria-disabled', 'true');
      // Playwright waits for an `aria-disabled` control to be enabled, so press it regardless.
      await userEvent.click(day(name), { force: true });
    }
    expect(onValueChange).not.toHaveBeenCalled();
    expect(day('Monday, October 5, 2026').element()).toHaveAttribute('aria-disabled', 'true');
    expect(day('Tuesday, October 6, 2026').element()).not.toHaveAttribute('aria-disabled');
    expect(style(day('Saturday, October 10, 2026').element()).opacity).toBe('0.38');
  });

  test('keeps a disabled day in the keyboard order, as the grid pattern asks', async () => {
    await render(<Sample isDateDisabled={(date) => date.getDate() === 24} />);
    day('Friday, October 23, 2026').element().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedLabel()).toBe('Saturday, October 24, 2026');
  });
});

test.describe('turning the month', () => {
  test('has arrows for the previous and next month', async () => {
    await render(<Sample />);
    await userEvent.click(page.getByRole('button', { name: 'Next month' }));
    await expect.element(page.getByRole('grid', { name: 'November 2026' })).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Previous month' }));
    await userEvent.click(page.getByRole('button', { name: 'Previous month' }));
    await expect.element(page.getByRole('grid', { name: 'September 2026' })).toBeVisible();
  });

  test('rolls over the year', async () => {
    await render(<Sample defaultValue={new Date(2026, 11, 15)} />);
    await userEvent.click(page.getByRole('button', { name: 'Next month' }));
    await expect.element(page.getByRole('grid', { name: 'January 2027' })).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Previous month' }));
    await expect.element(page.getByRole('grid', { name: 'December 2026' })).toBeVisible();
  });

  test('says the month in a live region, so a change is announced', async () => {
    await render(<Sample />);
    const live = monthButton().element().querySelector('[aria-live]') as HTMLElement;
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live.textContent).toBe('October 2026');
    await userEvent.click(page.getByRole('button', { name: 'Next month' }));
    expect(live.textContent).toBe('November 2026');
  });

  test('takes the day that has the focus with it, keeping to the days the month has', async () => {
    await render(<Sample defaultValue={new Date(2026, 0, 31)} today={new Date(2026, 0, 31)} />);
    await userEvent.click(page.getByRole('button', { name: 'Next month' }));
    // 31 January + a month is 28 February, which holds the tab stop.
    expect(day('Saturday, February 28, 2026').element()).toHaveAttribute('tabindex', '0');
  });

  test('stops at min and max', async () => {
    await render(<Sample min={new Date(2026, 8, 20)} max={new Date(2026, 10, 10)} />);
    await userEvent.click(page.getByRole('button', { name: 'Next month' }));
    expect(page.getByRole('button', { name: 'Next month' }).element()).toBeDisabled();
    await userEvent.click(page.getByRole('button', { name: 'Previous month' }));
    await userEvent.click(page.getByRole('button', { name: 'Previous month' }));
    expect(page.getByRole('button', { name: 'Previous month' }).element()).toBeDisabled();
    await expect.element(page.getByRole('grid', { name: 'September 2026' })).toBeVisible();
  });

  test('slides the new month in from the side it was turned to', async () => {
    await render(<Sample />);
    await userEvent.click(page.getByRole('button', { name: 'Next month' }));
    expect(grid().parentElement).toHaveAttribute('data-direction', 'next');
    await userEvent.click(page.getByRole('button', { name: 'Previous month' }));
    expect(grid().parentElement).toHaveAttribute('data-direction', 'previous');
  });

  test('opens on the month of `defaultMonth` when nothing is chosen', async () => {
    await render(<Sample defaultValue={null} defaultMonth={new Date(2025, 2, 1)} />);
    await expect.element(page.getByRole('grid', { name: 'March 2025' })).toBeVisible();
  });
});

test.describe('the keyboard', () => {
  const press = async (keys: string) => userEvent.keyboard(keys);

  test('moves a day or a week with the arrow keys', async () => {
    await render(<Sample />);
    day('Friday, October 23, 2026').element().focus();
    await press('{ArrowRight}');
    expect(focusedLabel()).toBe('Saturday, October 24, 2026');
    await press('{ArrowDown}');
    expect(focusedLabel()).toBe('Saturday, October 31, 2026');
    await press('{ArrowLeft}');
    expect(focusedLabel()).toBe('Friday, October 30, 2026');
    await press('{ArrowUp}');
    expect(focusedLabel()).toBe('Friday, October 23, 2026');
  });

  test('turns the month when an arrow crosses its edge, and the focus goes with it', async () => {
    await render(<Sample />);
    day('Saturday, October 31, 2026').element().focus();
    await press('{ArrowRight}');
    await expect.element(page.getByRole('grid', { name: 'November 2026' })).toBeVisible();
    expect(focusedLabel()).toBe('Sunday, November 1, 2026');
    await press('{ArrowLeft}');
    await expect.element(page.getByRole('grid', { name: 'October 2026' })).toBeVisible();
    expect(focusedLabel()).toBe('Saturday, October 31, 2026');
  });

  test('crosses a year', async () => {
    await render(<Sample defaultValue={new Date(2026, 11, 31)} />);
    day('Thursday, December 31, 2026').element().focus();
    await press('{ArrowDown}');
    await expect.element(page.getByRole('grid', { name: 'January 2027' })).toBeVisible();
    expect(focusedLabel()).toBe('Thursday, January 7, 2027');
  });

  test('Home and End go to the ends of the week, whichever day it starts on', async () => {
    const { rerender } = await render(<Sample />);
    day('Friday, October 23, 2026').element().focus();
    await press('{Home}');
    expect(focusedLabel()).toBe('Sunday, October 18, 2026');
    await press('{End}');
    expect(focusedLabel()).toBe('Saturday, October 24, 2026');
    await rerender(<Sample firstDayOfWeek={1} />);
    day('Friday, October 23, 2026').element().focus();
    await press('{Home}');
    expect(focusedLabel()).toBe('Monday, October 19, 2026');
    await press('{End}');
    expect(focusedLabel()).toBe('Sunday, October 25, 2026');
  });

  test('Page Up and Page Down turn the month, and with Shift the year', async () => {
    await render(<Sample />);
    day('Friday, October 23, 2026').element().focus();
    await press('{PageDown}');
    await expect.element(page.getByRole('grid', { name: 'November 2026' })).toBeVisible();
    expect(focusedLabel()).toBe('Monday, November 23, 2026');
    await press('{PageUp}{PageUp}');
    await expect.element(page.getByRole('grid', { name: 'September 2026' })).toBeVisible();
    expect(focusedLabel()).toBe('Wednesday, September 23, 2026');
    await press('{Shift>}{PageDown}{/Shift}');
    await expect.element(page.getByRole('grid', { name: 'September 2027' })).toBeVisible();
    expect(focusedLabel()).toBe('Thursday, September 23, 2027');
  });

  test('keeps to the days a month has when it turns', async () => {
    await render(<Sample defaultValue={new Date(2026, 0, 31)} today={TODAY} />);
    day('Saturday, January 31, 2026').element().focus();
    await press('{PageDown}');
    expect(focusedLabel()).toBe('Saturday, February 28, 2026');
  });

  test('stops at min and max', async () => {
    await render(<Sample min={new Date(2026, 9, 20)} max={new Date(2026, 9, 25)} />);
    day('Friday, October 23, 2026').element().focus();
    await press('{ArrowDown}');
    expect(focusedLabel()).toBe('Sunday, October 25, 2026');
    await press('{ArrowRight}');
    expect(focusedLabel()).toBe('Sunday, October 25, 2026');
    await press('{PageDown}');
    expect(focusedLabel()).toBe('Sunday, October 25, 2026');
    await press('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(focusedLabel()).toBe('Tuesday, October 20, 2026');
  });

  test('chooses the focused day with Enter and with Space', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    day('Friday, October 23, 2026').element().focus();
    await press('{ArrowRight}{Enter}');
    expect(ymd(onValueChange.mock.lastCall?.[0])).toBe('2026-10-24');
    await press('{ArrowDown} ');
    expect(ymd(onValueChange.mock.lastCall?.[0])).toBe('2026-10-31');
  });

  test('reverses the left and right arrows in a right-to-left layout', async () => {
    await render(
      <div dir="rtl">
        <Sample />
      </div>,
    );
    day('Friday, October 23, 2026').element().focus();
    await press('{ArrowRight}');
    expect(focusedLabel()).toBe('Thursday, October 22, 2026');
    await press('{ArrowLeft}{ArrowLeft}');
    expect(focusedLabel()).toBe('Saturday, October 24, 2026');
  });

  test('moves the one tab stop with the focus', async () => {
    await render(<Sample />);
    day('Friday, October 23, 2026').element().focus();
    await press('{ArrowRight}');
    expect(days().filter((d) => d.tabIndex === 0)).toHaveLength(1);
    expect(day('Saturday, October 24, 2026').element()).toHaveAttribute('tabindex', '0');
  });

  test('draws a focus ring on the day', async () => {
    await render(<Sample />);
    await userEvent.tab();
    // Past the month button and the two arrows to the grid.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(day('Friday, October 23, 2026').element());
    expect(style(document.activeElement as Element).outlineStyle).toBe('solid');
    expect(px(style(document.activeElement as Element).outlineWidth)).toBe(3);
  });
});

test.describe('the years', () => {
  const open = async () => {
    await userEvent.click(monthButton());
    await expect.element(page.getByRole('listbox', { name: 'Years' })).toBeVisible();
  };
  const year = (n: number) => page.getByRole('option', { name: String(n) });

  test('open from the month button, which says so, and hide the arrows', async () => {
    await render(<Sample />);
    expect(monthButton().element()).toHaveAttribute('aria-expanded', 'false');
    await open();
    expect(monthButton().element()).toHaveAttribute('aria-expanded', 'true');
    expect(page.getByRole('button', { name: 'Next month' }).elements()).toHaveLength(0);
    expect(page.getByRole('grid').elements()).toHaveLength(0);
  });

  test('name the month and say they open the years', async () => {
    await render(<Sample />);
    await expect
      .element(page.getByRole('button', { name: 'October 2026, Select year' }))
      .toBeVisible();
  });

  test('list the years from min to max, with the one on show selected', async () => {
    await render(<Sample min={new Date(2024, 0, 1)} max={new Date(2029, 11, 31)} />);
    await open();
    const options = page.getByRole('option').elements();
    expect(options.map((o) => o.textContent)).toEqual([
      '2024',
      '2025',
      '2026',
      '2027',
      '2028',
      '2029',
    ]);
    expect(year(2026).element()).toHaveAttribute('aria-selected', 'true');
    expect(year(2027).element()).toHaveAttribute('aria-selected', 'false');
  });

  test('default to a century either side of today', async () => {
    await render(<Sample />);
    await open();
    const options = page.getByRole('option').elements();
    expect(options[0]?.textContent).toBe('1926');
    expect(options.at(-1)?.textContent).toBe('2126');
  });

  test('are three to a row, 72x36 pills, with the current year outlined', async () => {
    await render(<Sample min={new Date(2024, 0, 1)} max={new Date(2029, 11, 31)} />);
    await open();
    expect(rect(year(2026).element()).width).toBe(72);
    expect(rect(year(2026).element()).height).toBe(36);
    expect(px(style(year(2026).element()).borderTopLeftRadius)).toBe(18);
    expect(rect(year(2025).element()).top).toBe(rect(year(2024).element()).top);
    expect(rect(year(2027).element()).top).toBeGreaterThan(rect(year(2024).element()).top);
    // Selected: primary and on-primary; the current year (2026 here too) is not outlined when selected.
    await expect.poll(() => style(year(2026).element()).backgroundColor).toBe('rgb(103, 80, 164)');
    expect(style(year(2026).element()).color).toBe('rgb(255, 255, 255)');
    expect(style(year(2025).element()).color).toBe('rgb(73, 69, 79)');
  });

  test('outline the current year when it is not the one chosen', async () => {
    await render(
      <Sample
        defaultValue={new Date(2028, 4, 1)}
        min={new Date(2024, 0, 1)}
        max={new Date(2029, 11, 31)}
      />,
    );
    await open();
    expect(style(year(2026).element()).boxShadow).toContain('rgb(103, 80, 164)');
    expect(style(year(2028).element()).boxShadow).toBe('none');
  });

  test('scroll to the selected year, and focus it', async () => {
    await render(<Sample />);
    await open();
    const list = page.getByRole('listbox').element() as HTMLElement;
    expect(list.scrollTop).toBeGreaterThan(0);
    const selected = year(2026).element();
    const offset =
      rect(selected).top + rect(selected).height / 2 - (rect(list).top + rect(list).height / 2);
    expect(Math.abs(offset)).toBeLessThan(40);
    expect(selected).toHaveFocus();
  });

  test('are as tall as the days, so the picker does not resize', async () => {
    await render(<Sample />);
    const before = rect(grid().parentElement as Element).height;
    await open();
    expect(rect(page.getByRole('listbox').element()).height).toBe(before);
    expect(before).toBe(7 * 48);
  });

  test('choosing one goes back to the days, in the same month of that year', async () => {
    await render(<Sample min={new Date(2024, 0, 1)} max={new Date(2029, 11, 31)} />);
    await open();
    await userEvent.click(year(2028));
    await expect.element(page.getByRole('grid', { name: 'October 2028' })).toBeVisible();
    expect(monthButton().element()).toHaveAttribute('aria-expanded', 'false');
    // The focus is on the day that held it, a year and a bit on.
    expect(focusedLabel()).toBe('Monday, October 23, 2028');
  });

  test('keep the month in range when the year is the last allowed', async () => {
    await render(<Sample min={new Date(2026, 5, 1)} max={new Date(2028, 2, 15)} />);
    await open();
    await userEvent.click(year(2028));
    // October 2028 is past max, so it is as near as the range allows.
    await expect.element(page.getByRole('grid', { name: 'March 2028' })).toBeVisible();
  });

  test('move with the arrow keys, a year or a row at a time, and stop at the ends', async () => {
    await render(<Sample min={new Date(2024, 0, 1)} max={new Date(2029, 11, 31)} />);
    await open();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(year(2027).element());
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(year(2029).element());
    await userEvent.keyboard('{ArrowDown}{ArrowRight}');
    expect(document.activeElement).toBe(year(2029).element());
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowLeft}');
    expect(document.activeElement).toBe(year(2024).element());
  });

  test('choose with Enter', async () => {
    await render(<Sample min={new Date(2024, 0, 1)} max={new Date(2029, 11, 31)} />);
    await open();
    await userEvent.keyboard('{ArrowLeft}{Enter}');
    await expect.element(page.getByRole('grid', { name: 'October 2025' })).toBeVisible();
  });

  test('close on Escape, and give the focus back to the month button', async () => {
    await render(<Sample />);
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('grid', { name: 'October 2026' })).toBeVisible();
    expect(monthButton().element()).toHaveFocus();
  });

  test('close when the month button is pressed again', async () => {
    await render(<Sample />);
    await open();
    await userEvent.click(monthButton());
    await expect.element(page.getByRole('grid')).toBeVisible();
  });

  test('have the selected year as their one tab stop', async () => {
    await render(<Sample min={new Date(2024, 0, 1)} max={new Date(2029, 11, 31)} />);
    await open();
    const options = page.getByRole('option').elements() as HTMLElement[];
    expect(options.filter((o) => o.tabIndex === 0)).toHaveLength(1);
    expect(year(2026).element()).toHaveAttribute('tabindex', '0');
  });
});

test.describe('locales', () => {
  test('names the months and days in the locale, and starts the week where it does', async () => {
    await render(<Sample locale="de-DE" firstDayOfWeek={undefined} />);
    await expect.element(page.getByRole('grid', { name: 'Oktober 2026' })).toBeVisible();
    await expect.element(day('Freitag, 23. Oktober 2026')).toBeVisible();
    const headers = page.getByRole('columnheader').elements();
    expect(headers[0]?.textContent).toContain('Montag');
    expect(headers[6]?.textContent).toContain('Sonntag');
  });

  test('takes translated labels', async () => {
    await render(
      <Sample
        locale="de-DE"
        labels={{
          previousMonth: 'Zurück',
          nextMonth: 'Weiter',
          selectYear: 'Jahr wählen',
          years: 'Jahre',
        }}
      />,
    );
    await expect.element(page.getByRole('button', { name: 'Zurück' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Weiter' })).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: /Jahr wählen/ }));
    await expect.element(page.getByRole('listbox', { name: 'Jahre' })).toBeVisible();
  });
});

test('forwards a ref, a class and props to the surface', async () => {
  let node: HTMLDivElement | null = null;
  const { container } = await render(
    <Sample
      className="mine"
      data-testid="picker"
      ref={(el) => {
        node = el;
      }}
    />,
  );
  expect(node).toBe(container.firstElementChild);
  expect(node).toHaveClass('mine');
  expect((node as HTMLElement | null)?.getAttribute('data-testid')).toBe('picker');
});
