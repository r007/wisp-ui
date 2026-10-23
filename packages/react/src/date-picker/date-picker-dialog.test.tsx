import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { DatePickerDialog, type DatePickerDialogProps } from './date-picker-dialog.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const dialogEl = () => document.querySelector('dialog') as HTMLDialogElement;
const surface = () => dialogEl().firstElementChild as HTMLElement;
const day = (name: string) => page.getByRole('button', { name, exact: true });
const ok = () => page.getByRole('button', { name: 'OK' });
const cancel = () => page.getByRole('button', { name: 'Cancel' });
const field = () => page.getByRole('textbox', { name: 'Date' });
const ymd = (date: Date | null | undefined) =>
  date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;

const TODAY = new Date(2026, 9, 14);
const CHOSEN = new Date(2026, 9, 23);

function Host({
  initial = CHOSEN,
  onConfirm,
  ...props
}: Partial<DatePickerDialogProps> & { initial?: Date | null }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Date | null>(initial);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <output data-testid="value">{ymd(value) ?? 'none'}</output>
      <DatePickerDialog
        today={TODAY}
        locale="en-US"
        firstDayOfWeek={0}
        {...props}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onConfirm={(date) => {
          setValue(date);
          onConfirm?.(date);
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
  test('is a modal named by its supporting text, with Cancel and OK', async () => {
    await render(<Host />);
    await open();
    expect(dialogEl().matches(':modal')).toBe(true);
    await expect.element(page.getByRole('dialog', { name: 'Select date' })).toBeVisible();
    await expect.element(cancel()).toBeVisible();
    await expect.element(ok()).toBeVisible();
  });

  test('says the chosen day in its headline', async () => {
    await render(<Host />);
    await open();
    await expect.element(page.getByText('Fri, Oct 23')).toBeVisible();
  });

  test('asks for a day when none is chosen', async () => {
    await render(<Host initial={null} />);
    await open();
    // The supporting text and the headline both say it.
    expect(page.getByText('Select date').elements()).toHaveLength(2);
  });

  test('is 360px wide with 28px corners, a 120px header and a divider under it, and casts a shadow', async () => {
    await render(<Host />);
    await open();
    expect(rect(surface()).width).toBe(360);
    expect(px(style(surface()).borderTopLeftRadius)).toBe(28);
    expect(style(surface()).backgroundColor).toBe('rgb(236, 230, 240)');
    expect(/[1-9]\d*(?:\.\d+)?px/.test(style(surface()).boxShadow)).toBe(true);
    const header = surface().firstElementChild as HTMLElement;
    expect(rect(header).height).toBe(120);
    expect(style(header).borderBottomWidth).toBe('1px');
    expect(rect(surface()).height).toBeGreaterThanOrEqual(524);
  });

  test('is the same height whatever the month, so it does not jump as the month turns', async () => {
    await render(<Host />);
    await open();
    const before = rect(surface()).height;
    // October 2026 has five weeks; February 2027 has four.
    for (let n = 0; n < 4; n++)
      await userEvent.click(page.getByRole('button', { name: 'Next month' }));
    await expect.element(page.getByRole('grid', { name: 'February 2027' })).toBeVisible();
    expect(rect(surface()).height).toBe(before);
  });

  test('uses the modal’s smaller days, with none from the months either side', async () => {
    await render(<Host />);
    await open();
    expect(rect(day('Friday, October 23, 2026').element().closest('td') as Element).height).toBe(
      40,
    );
    expect(surface().querySelectorAll('button[aria-label*="September"]')).toHaveLength(0);
  });

  test('starts on the month of the day it is given', async () => {
    await render(<Host initial={new Date(2027, 2, 9)} />);
    await open();
    await expect.element(page.getByRole('grid', { name: 'March 2027' })).toBeVisible();
    expect(day('Tuesday, March 9, 2027').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('moves focus inside when opened, and back to the opener when closed', async () => {
    await render(<Host />);
    await open();
    expect(dialogEl().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogEl().open).toBe(false);
    await expect.element(page.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  test('closes on Escape and on a press on the scrim, reporting nothing', async () => {
    const onConfirm = vi.fn();
    await render(<Host onConfirm={onConfirm} />);
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogEl().open).toBe(false);
    await open();
    // Well outside the dialog, on the scrim. (Not the dialog's own corner: WebKit does not clip
    // hit tests by a rounded corner, so there it lands on the header.)
    await userEvent.click(document.body, { position: { x: 4, y: 4 }, force: true });
    await expect.poll(() => dialogEl().open).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

test.describe('choosing', () => {
  test('changes the headline as a day is chosen, and reports it only when OK is pressed', async () => {
    const onConfirm = vi.fn();
    await render(<Host onConfirm={onConfirm} />);
    await open();
    await userEvent.click(day('Monday, October 5, 2026'));
    await expect.element(page.getByText('Mon, Oct 5')).toBeVisible();
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(ok());
    expect(ymd(onConfirm.mock.lastCall?.[0])).toBe('2026-10-5');
    await expect.poll(() => dialogEl().open).toBe(false);
    await expect.element(page.getByTestId('value')).toHaveTextContent('2026-10-5');
  });

  test('reports nothing when it is cancelled, and the next opening starts afresh', async () => {
    const onConfirm = vi.fn();
    await render(<Host onConfirm={onConfirm} />);
    await open();
    await userEvent.click(day('Monday, October 5, 2026'));
    await userEvent.click(page.getByRole('button', { name: 'Next month' }));
    await userEvent.click(cancel());
    expect(onConfirm).not.toHaveBeenCalled();
    await expect.poll(() => dialogEl().open).toBe(false);
    await open();
    // The value it was given, on its month, and not where it was left.
    await expect.element(page.getByRole('grid', { name: 'October 2026' })).toBeVisible();
    expect(day('Friday, October 23, 2026').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(day('Monday, October 5, 2026').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  test('has OK off until there is a day', async () => {
    await render(<Host initial={null} />);
    await open();
    expect(ok().element()).toBeDisabled();
    await userEvent.click(day('Monday, October 5, 2026'));
    expect(ok().element()).toBeEnabled();
  });

  test('keeps to min, max and isDateDisabled', async () => {
    await render(
      <Host
        min={new Date(2026, 9, 10)}
        max={new Date(2026, 9, 28)}
        isDateDisabled={(date) => date.getDay() === 0}
      />,
    );
    await open();
    expect(day('Friday, October 9, 2026').element()).toHaveAttribute('aria-disabled', 'true');
    expect(day('Sunday, October 11, 2026').element()).toHaveAttribute('aria-disabled', 'true');
    expect(day('Monday, October 12, 2026').element()).not.toHaveAttribute('aria-disabled');
    expect(day('Thursday, October 29, 2026').element()).toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('typing a date', () => {
  const toText = () => userEvent.click(page.getByRole('button', { name: 'Switch to text input' }));

  test('swaps the calendar for a field, with the format as its hint, and the headline for “Enter date”', async () => {
    await render(<Host />);
    await open();
    await toText();
    await expect.element(field()).toBeVisible();
    expect(page.getByRole('grid').elements()).toHaveLength(0);
    await expect.element(page.getByText('Enter date')).toBeVisible();
    expect(field().element()).toHaveAttribute('placeholder', 'mm/dd/yyyy');
    await expect.element(page.getByText('mm/dd/yyyy', { exact: true }).first()).toBeVisible();
  });

  test('is narrower: 328px', async () => {
    await render(<Host />);
    await open();
    await toText();
    expect(rect(surface()).width).toBe(328);
  });

  test('starts with the day that was chosen, written the locale’s way', async () => {
    await render(<Host />);
    await open();
    await toText();
    expect((field().element() as HTMLInputElement).value).toBe('10/23/2026');
  });

  test('takes a typed date, and OK reports it', async () => {
    const onConfirm = vi.fn();
    await render(<Host onConfirm={onConfirm} />);
    await open();
    await toText();
    await userEvent.fill(field(), '11/05/2026');
    expect(ok().element()).toBeEnabled();
    expect(field().element()).not.toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(ok());
    expect(ymd(onConfirm.mock.lastCall?.[0])).toBe('2026-11-5');
  });

  test('says when what was typed is not a date, and turns OK off', async () => {
    await render(<Host />);
    await open();
    await toText();
    await userEvent.fill(field(), '13/45/2026');
    await expect.element(page.getByText('Invalid format.')).toBeVisible();
    expect(field().element()).toHaveAttribute('aria-invalid', 'true');
    expect(ok().element()).toBeDisabled();
    // A day the month does not have is not a date either.
    await userEvent.fill(field(), '02/30/2026');
    await expect.element(page.getByText('Invalid format.')).toBeVisible();
    expect(ok().element()).toBeDisabled();
    // And it is fine again once it is one.
    await userEvent.fill(field(), '02/27/2026');
    expect(page.getByText('Invalid format.').elements()).toHaveLength(0);
    expect(ok().element()).toBeEnabled();
  });

  test('says when the date is out of range, or cannot be chosen', async () => {
    await render(
      <Host
        min={new Date(2026, 0, 1)}
        max={new Date(2026, 11, 31)}
        isDateDisabled={(date) => date.getDay() === 0}
      />,
    );
    await open();
    await toText();
    await userEvent.fill(field(), '01/01/2025');
    await expect.element(page.getByText('Out of range.')).toBeVisible();
    expect(ok().element()).toBeDisabled();
    await userEvent.fill(field(), '01/01/2027');
    await expect.element(page.getByText('Out of range.')).toBeVisible();
    // 25 October 2026 is a Sunday.
    await userEvent.fill(field(), '10/25/2026');
    await expect.element(page.getByText('This date is not available.')).toBeVisible();
    expect(ok().element()).toBeDisabled();
  });

  test('has OK off while it is empty, without calling that an error', async () => {
    await render(<Host />);
    await open();
    await toText();
    await userEvent.clear(field());
    expect(ok().element()).toBeDisabled();
    expect(field().element()).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('reads a day-first date in a locale that writes it so', async () => {
    const onConfirm = vi.fn();
    await render(<Host locale="en-GB" onConfirm={onConfirm} />);
    await open();
    await toText();
    expect(field().element()).toHaveAttribute('placeholder', 'dd/mm/yyyy');
    expect((field().element() as HTMLInputElement).value).toBe('23/10/2026');
    await userEvent.fill(field(), '05/11/2026');
    await userEvent.click(ok());
    expect(ymd(onConfirm.mock.lastCall?.[0])).toBe('2026-11-5');
  });

  test('goes back to the calendar on the date that was typed', async () => {
    await render(<Host />);
    await open();
    await toText();
    await userEvent.fill(field(), '03/09/2027');
    await userEvent.click(page.getByRole('button', { name: 'Switch to calendar' }));
    await expect.element(page.getByRole('grid', { name: 'March 2027' })).toBeVisible();
    expect(day('Tuesday, March 9, 2027').element().closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect.element(page.getByText('Tue, Mar 9')).toBeVisible();
  });

  test('can start in text mode', async () => {
    await render(<Host defaultMode="input" />);
    await open();
    await expect.element(field()).toBeVisible();
  });

  test('starts afresh in the calendar each time it opens', async () => {
    await render(<Host />);
    await open();
    await toText();
    await userEvent.click(cancel());
    await expect.poll(() => dialogEl().open).toBe(false);
    await open();
    await expect.element(page.getByRole('grid', { name: 'October 2026' })).toBeVisible();
  });

  test('can do without the button that switches', async () => {
    await render(<Host showModeToggle={false} />);
    await open();
    expect(page.getByRole('button', { name: /Switch to/ }).elements()).toHaveLength(0);
  });

  test('asks the parent when the mode is controlled', async () => {
    const onModeChange = vi.fn();
    await render(<Host mode="calendar" onModeChange={onModeChange} />);
    await open();
    await userEvent.click(page.getByRole('button', { name: 'Switch to text input' }));
    expect(onModeChange).toHaveBeenCalledWith('input');
    expect(page.getByRole('grid').elements()).toHaveLength(1);
  });
});

test('takes its texts from labels, for translating', async () => {
  await render(
    <Host
      initial={null}
      locale="de-DE"
      labels={{
        selectDate: 'Datum auswählen',
        enterDate: 'Datum eingeben',
        date: 'Datum',
        cancel: 'Abbrechen',
        confirm: 'Übernehmen',
        useKeyboard: 'Zur Texteingabe',
        invalidFormat: 'Ungültiges Format.',
      }}
    />,
  );
  await open();
  await expect.element(page.getByRole('dialog', { name: 'Datum auswählen' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Übernehmen' })).toBeVisible();
  await userEvent.click(page.getByRole('button', { name: 'Zur Texteingabe' }));
  await expect.element(page.getByText('Datum eingeben')).toBeVisible();
  const german = page.getByRole('textbox', { name: 'Datum' });
  expect(german.element()).toHaveAttribute('placeholder', 'dd.mm.yyyy');
  await userEvent.fill(german, 'x');
  await expect.element(page.getByText('Ungültiges Format.')).toBeVisible();
});
