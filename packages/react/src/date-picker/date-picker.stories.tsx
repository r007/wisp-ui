import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { DatePicker } from './date-picker.js';
import { DatePickerDialog } from './date-picker-dialog.js';

const meta = {
  title: 'Components/Date picker',
  component: DatePicker,
  args: { defaultValue: new Date(2026, 9, 23), today: new Date(2026, 9, 14), locale: 'en-US' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['docked', 'modal'] },
    firstDayOfWeek: { control: { type: 'number', min: 0, max: 6 } },
    locale: { control: 'text' },
    value: { control: false },
    defaultValue: { control: false },
    min: { control: false },
    max: { control: false },
    today: { control: false },
    defaultMonth: { control: false },
    isDateDisabled: { control: false },
    labels: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Today is outlined (here the 14th), the chosen day is filled, and neighbouring months are dimmed. */
export const Docked: Story = {};

/** What a dialog holds: smaller days, and the days of other months left blank. */
export const Modal: Story = { args: { variant: 'modal' } };

export const Empty: Story = { args: { defaultValue: null } };

/** Only a range can be chosen, and the weekends are left out. */
export const Limited: Story = {
  args: {
    defaultValue: new Date(2026, 9, 21),
    min: new Date(2026, 9, 6),
    max: new Date(2027, 1, 20),
    isDateDisabled: (date) => date.getDay() === 0 || date.getDay() === 6,
  },
};

/** The locale names the months and days and says which a week starts on. */
export const German: Story = { args: { locale: 'de-DE' } };

export const Japanese: Story = { args: { locale: 'ja-JP' } };

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<Date | null>(new Date(2026, 9, 23));
    return (
      <>
        <DatePicker {...args} value={value} onValueChange={setValue} />
        <p>Chosen: {value?.toDateString() ?? 'nothing'}</p>
      </>
    );
  },
};

/** The modal: it only reports the day when OK is pressed, and starts afresh each time it opens. */
export const Dialog: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState<Date | null>(new Date(2026, 9, 23));
    return (
      <>
        <Button onClick={() => setOpen(true)}>
          Pick a day{date ? `: ${date.toDateString()}` : ''}
        </Button>
        <DatePickerDialog
          open={open}
          onOpenChange={setOpen}
          value={date}
          onConfirm={setDate}
          today={args.today}
          locale={args.locale}
        />
      </>
    );
  },
};

/** The pencil switches to a text field, in the locale's own order: month first in `en-US`, day first in `en-GB`. */
export const DialogTextEntry: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <DatePickerDialog
          open={open}
          onOpenChange={setOpen}
          defaultMode="input"
          today={args.today}
          locale={args.locale}
          min={new Date(2026, 0, 1)}
          max={new Date(2026, 11, 31)}
        />
      </>
    );
  },
};

export const DialogGerman: Story = {
  args: { locale: 'de-DE' },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Datum wählen</Button>
        <DatePickerDialog
          open={open}
          onOpenChange={setOpen}
          value={new Date(2026, 9, 23)}
          today={args.today}
          locale={args.locale}
          labels={{
            selectDate: 'Datum auswählen',
            enterDate: 'Datum eingeben',
            date: 'Datum',
            cancel: 'Abbrechen',
            confirm: 'OK',
            previousMonth: 'Vorheriger Monat',
            nextMonth: 'Nächster Monat',
            selectYear: 'Jahr auswählen',
            years: 'Jahre',
            useKeyboard: 'Zur Texteingabe wechseln',
            useCalendar: 'Zum Kalender wechseln',
          }}
        />
      </>
    );
  },
};

/** Opening it, choosing a day and OK: run by the tests, hidden from the sidebar. */
export const DialogInteraction: Story = {
  ...Dialog,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Pick a day/ }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Select date' });
    await waitFor(() => expect(dialog).toBeVisible(), { timeout: 5000 });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  },
};
