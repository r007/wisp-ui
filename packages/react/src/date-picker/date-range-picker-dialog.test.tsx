import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  DateRangePickerDialog,
  type DateRangePickerDialogProps,
} from './date-range-picker-dialog.js';
import type { DateRange } from './range-calendar.js';

const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const dialogEl = () => document.querySelector('dialog') as HTMLDialogElement;
const surface = () => dialogEl().firstElementChild as HTMLElement;
const day = (name: string) => page.getByRole('button', { name, exact: true });
const save = () => page.getByRole('button', { name: 'Save' });
const close = () => page.getByRole('button', { name: 'Close' });
const startField = () => page.getByRole('textbox', { name: 'Start date' });
const endField = () => page.getByRole('textbox', { name: 'End date' });
const ymd = (date: Date | null | undefined) =>
  date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;
const d = (month: number, date: number, year = 2026) => new Date(year, month - 1, date);

const TODAY = d(10, 14);
const START: DateRange = { start: d(10, 21), end: d(11, 3) };
const NONE: DateRange = { start: null, end: null };

function Host({
  initial = START,
  onConfirm,
  ...props
}: Partial<DateRangePickerDialogProps> & { initial?: DateRange }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<DateRange>(initial);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <output data-testid="value">
        {ymd(value.start) ?? 'none'} to {ymd(value.end) ?? 'none'}
      </output>
      <DateRangePickerDialog
        today={TODAY}
        locale="en-US"
        firstDayOfWeek={0}
        min={d(9, 1)}
        max={d(12, 31)}
        {...props}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onConfirm={(range) => {
          setValue(range);
          onConfirm?.(range);
        }}
      />
    </>
  );
}

const open = async () => {
  await userEvent.click(page.getByRole('button', { name: 'Open' }));
  await expect.poll(() => dialogEl().open).toBe(true);
};

test.describe('the dialog', () => {
  test('is a modal named “Select dates”, with Close and Save', async () => {
    await render(<Host />);
    await open();
    expect(dialogEl().matches(':modal')).toBe(true);
    await expect.element(page.getByRole('dialog', { name: 'Select dates' })).toBeVisible();
    await expect.element(close()).toBeVisible();
    await expect.element(save()).toBeVisible();
  });

  test('fills the window, square and flat', async () => {
    await render(<Host />);
    await open();
    await expect.poll(() => rect(dialogEl()).width).toBe(window.innerWidth);
    expect(rect(dialogEl()).height).toBe(window.innerHeight);
    expect(style(surface()).borderTopLeftRadius).toBe('0px');
    expect(/[1-9]\d*(?:\.\d+)?px/.test(style(surface()).boxShadow)).toBe(false);
    expect(style(surface()).backgroundColor).toBe('rgb(236, 230, 240)');
  });

  test('has a header 128px tall, with the headline in the title-large type', async () => {
    await render(<Host />);
    await open();
    const header = surface().firstElementChild as HTMLElement;
    expect(rect(header).height).toBeGreaterThanOrEqual(128);
    expect(style(page.getByText(/Oct 21/).element()).fontSize).toBe('22px');
  });

  test('says the range in its headline: both ends, one, or neither', async () => {
    await render(<Host />);
    await open();
    await expect.element(page.getByText('Oct 21 – Nov 3, 2026')).toBeVisible();
    await userEvent.click(day('Monday, October 5, 2026'));
    await expect.element(page.getByText('Oct 5, 2026 – End date')).toBeVisible();
    await userEvent.click(day('Friday, October 9, 2026'));
    await expect.element(page.getByText('Oct 5 – 9, 2026')).toBeVisible();
  });

  test('asks for both ends when none is chosen', async () => {
    await render(<Host initial={NONE} />);
    await open();
    await expect.element(page.getByText('Start date – End date')).toBeVisible();
  });

  test('opens on the month the range starts in, with its band', async () => {
    // Months enough to scroll to it: the list stops where its last month meets the bottom.
    await render(<Host max={d(12, 31, 2028)} />);
    await open();
    const cell = day('Thursday, October 22, 2026').element().closest('td') as HTMLElement;
    expect(cell).toHaveAttribute('data-range', 'middle');
    const list = document.querySelector('[data-month]')?.parentElement as HTMLElement;
    await expect.poll(() => list.scrollTop).toBeGreaterThan(0);
    const october = list.querySelector('[data-month="2026-9"]') as HTMLElement;
    await expect.poll(() => Math.abs(rect(october).top - rect(list).top)).toBeLessThan(2);
  });

  test('moves focus inside when opened, and back to the opener when closed', async () => {
    await render(<Host />);
    await open();
    expect(dialogEl().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogEl().open).toBe(false);
    await expect.element(page.getByRole('button', { name: 'Open' })).toHaveFocus();
  });
});

test.describe('saving', () => {
  test('has Save off until both ends are chosen', async () => {
    await render(<Host initial={NONE} />);
    await open();
    expect(save().element()).toBeDisabled();
    await userEvent.click(day('Monday, October 5, 2026'));
    expect(save().element()).toBeDisabled();
    await userEvent.click(day('Friday, October 9, 2026'));
    expect(save().element()).toBeEnabled();
  });

  test('reports the whole range when Save is pressed, and closes', async () => {
    const onConfirm = vi.fn();
    await render(<Host initial={NONE} onConfirm={onConfirm} />);
    await open();
    await userEvent.click(day('Monday, October 5, 2026'));
    await userEvent.click(day('Friday, October 9, 2026'));
    await userEvent.click(save());
    expect(ymd(onConfirm.mock.lastCall?.[0].start)).toBe('2026-10-5');
    expect(ymd(onConfirm.mock.lastCall?.[0].end)).toBe('2026-10-9');
    await expect.poll(() => dialogEl().open).toBe(false);
    await expect.element(page.getByTestId('value')).toHaveTextContent('2026-10-5 to 2026-10-9');
  });

  test('reports nothing on Close or Escape, and the next opening starts afresh', async () => {
    const onConfirm = vi.fn();
    await render(<Host onConfirm={onConfirm} />);
    await open();
    await userEvent.click(day('Monday, October 5, 2026'));
    await userEvent.click(close());
    expect(onConfirm).not.toHaveBeenCalled();
    await expect.poll(() => dialogEl().open).toBe(false);
    await open();
    // The range it was given, and not what was begun.
    await expect.element(page.getByText('Oct 21 – Nov 3, 2026')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogEl().open).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

test.describe('typing the dates', () => {
  const toText = () => userEvent.click(page.getByRole('button', { name: 'Switch to text input' }));

  test('swaps the months for two fields, with the range written the locale’s way', async () => {
    await render(<Host />);
    await open();
    await toText();
    expect(page.getByRole('grid').elements()).toHaveLength(0);
    expect((startField().element() as HTMLInputElement).value).toBe('10/21/2026');
    expect((endField().element() as HTMLInputElement).value).toBe('11/03/2026');
    expect(startField().element()).toHaveAttribute('placeholder', 'mm/dd/yyyy');
  });

  test('takes typed dates, and Save reports them', async () => {
    const onConfirm = vi.fn();
    await render(<Host initial={NONE} onConfirm={onConfirm} defaultMode="input" />);
    await open();
    expect(save().element()).toBeDisabled();
    await userEvent.fill(startField(), '10/05/2026');
    await userEvent.fill(endField(), '10/09/2026');
    expect(save().element()).toBeEnabled();
    await expect.element(page.getByText('Oct 5 – 9, 2026')).toBeVisible();
    await userEvent.click(save());
    expect(ymd(onConfirm.mock.lastCall?.[0].start)).toBe('2026-10-5');
    expect(ymd(onConfirm.mock.lastCall?.[0].end)).toBe('2026-10-9');
  });

  test('says what is wrong with a date, in the field it is in', async () => {
    await render(
      <Host initial={NONE} defaultMode="input" isDateDisabled={(date) => date.getDay() === 0} />,
    );
    await open();
    await userEvent.fill(startField(), '13/45/2026');
    await expect.element(page.getByText('Invalid format.')).toBeVisible();
    expect(startField().element()).toHaveAttribute('aria-invalid', 'true');
    expect(endField().element()).not.toHaveAttribute('aria-invalid', 'true');
    await userEvent.fill(startField(), '01/01/2025');
    await expect.element(page.getByText('Out of range.')).toBeVisible();
    // 25 October 2026 is a Sunday.
    await userEvent.fill(startField(), '10/25/2026');
    await expect.element(page.getByText('This date is not available.')).toBeVisible();
    expect(save().element()).toBeDisabled();
  });

  test('says when the end is before the start, and keeps Save off', async () => {
    await render(<Host initial={NONE} defaultMode="input" />);
    await open();
    await userEvent.fill(startField(), '10/09/2026');
    await userEvent.fill(endField(), '10/05/2026');
    await expect.element(page.getByText('The end must not be before the start.')).toBeVisible();
    expect(endField().element()).toHaveAttribute('aria-invalid', 'true');
    expect(save().element()).toBeDisabled();
    await userEvent.fill(endField(), '10/12/2026');
    expect(page.getByText('The end must not be before the start.').elements()).toHaveLength(0);
    expect(save().element()).toBeEnabled();
  });

  test('goes back to the months on the range that was typed', async () => {
    await render(<Host initial={NONE} defaultMode="input" />);
    await open();
    await userEvent.fill(startField(), '11/10/2026');
    await userEvent.fill(endField(), '11/12/2026');
    await userEvent.click(page.getByRole('button', { name: 'Switch to calendar' }));
    const cell = day('Wednesday, November 11, 2026').element().closest('td') as HTMLElement;
    expect(cell).toHaveAttribute('data-range', 'middle');
  });

  test('reads day-first dates in a locale that writes them so', async () => {
    const onConfirm = vi.fn();
    await render(<Host locale="en-GB" initial={NONE} defaultMode="input" onConfirm={onConfirm} />);
    await open();
    await userEvent.fill(startField(), '05/10/2026');
    await userEvent.fill(endField(), '09/10/2026');
    await userEvent.click(save());
    expect(ymd(onConfirm.mock.lastCall?.[0].start)).toBe('2026-10-5');
  });
});

test('takes its texts from labels, for translating', async () => {
  await render(
    <Host
      initial={NONE}
      labels={{
        selectDates: 'Daten wählen',
        save: 'Speichern',
        close: 'Schließen',
        startDate: 'Beginn',
        endDate: 'Ende',
      }}
    />,
  );
  await open();
  await expect.element(page.getByRole('dialog', { name: 'Daten wählen' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Speichern' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Schließen' })).toBeVisible();
  await expect.element(page.getByText('Beginn – Ende')).toBeVisible();
});
