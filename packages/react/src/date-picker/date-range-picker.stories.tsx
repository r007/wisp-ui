import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { DateRangePicker } from './date-range-picker.js';
import { DateRangePickerDialog } from './date-range-picker-dialog.js';
import type { DateRange } from './range-calendar.js';

const meta = {
  title: 'Components/Date range picker',
  component: DateRangePicker,
  args: {
    defaultValue: { start: new Date(2026, 9, 21), end: new Date(2026, 10, 3) },
    today: new Date(2026, 9, 14),
    locale: 'en-US',
  },
  argTypes: {
    firstDayOfWeek: { control: { type: 'number', min: 0, max: 6 } },
    locale: { control: 'text' },
    value: { control: false },
    defaultValue: { control: false },
    min: { control: false },
    max: { control: false },
    today: { control: false },
    isDateDisabled: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press a day to start a range and another to end it; a band joins them, capped where a week ends. */
export const Playground: Story = {};

/** Pressing a day while a range is being chosen ends it, or, if it is before the start, restarts it. */
export const Choosing: Story = {
  args: { defaultValue: { start: new Date(2026, 9, 16), end: null } },
};

export const SingleDay: Story = {
  args: { defaultValue: { start: new Date(2026, 9, 16), end: new Date(2026, 9, 16) } },
};

export const Limited: Story = {
  args: {
    min: new Date(2026, 9, 1),
    max: new Date(2027, 0, 31),
    isDateDisabled: (date) => date.getDay() === 0 || date.getDay() === 6,
  },
};

export const German: Story = { args: { locale: 'de-DE' } };

export const Controlled: Story = {
  render: (args) => {
    const [range, setRange] = useState<DateRange>({ start: new Date(2026, 9, 21), end: null });
    return (
      <>
        <DateRangePicker {...args} value={range} onValueChange={setRange} />
        <p>
          {range.start?.toDateString() ?? 'no start'} to {range.end?.toDateString() ?? 'no end'}
        </p>
      </>
    );
  },
};

/** The modal fills the window. It only reports the range, whole, when Save is pressed. */
export const Dialog: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => {
    const [open, setOpen] = useState(false);
    const [range, setRange] = useState<DateRange>(args.defaultValue ?? { start: null, end: null });
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Pick dates</Button>
        <p>
          {range.start?.toDateString() ?? 'none'} to {range.end?.toDateString() ?? 'none'}
        </p>
        <DateRangePickerDialog
          open={open}
          onOpenChange={setOpen}
          value={range}
          onConfirm={setRange}
          today={args.today}
          locale={args.locale}
        />
      </div>
    );
  },
};

/** The pencil swaps the months for two fields, which say what is wrong with a date typed in them. */
export const DialogTextEntry: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <DateRangePickerDialog
          open={open}
          onOpenChange={setOpen}
          defaultMode="input"
          today={args.today}
          locale={args.locale}
          value={args.defaultValue ?? { start: null, end: null }}
        />
      </div>
    );
  },
};

/** Opening it and closing it again: run by the tests, hidden from the sidebar. */
export const DialogInteraction: Story = {
  ...Dialog,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Pick dates' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Select dates' });
    await waitFor(() => expect(dialog).toBeVisible(), { timeout: 5000 });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  },
};
