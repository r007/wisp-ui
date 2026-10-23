import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { TimePicker } from './time-picker.js';
import { TimePickerDialog } from './time-picker-dialog.js';
import type { TimeValue } from './time-value.js';

const meta = {
  title: 'Components/Time picker',
  component: TimePicker,
  args: { defaultValue: { hours: 14, minutes: 35 } },
  argTypes: {
    hourCycle: { control: 'inline-radio', options: [12, 24] },
    mode: { control: 'inline-radio', options: ['dial', 'input'] },
    orientation: { control: 'inline-radio', options: ['auto', 'vertical', 'horizontal'] },
    value: { control: false },
    defaultValue: { control: false },
    actions: { control: false },
    labels: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof TimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const format = ({ hours, minutes }: TimeValue) =>
  `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

/** Turn the clock: the hours first, then the minutes, which settle on the nearest five. */
export const Playground: Story = {};

/** A 24-hour clock has a second ring inside the first for the hours from 12 to 23. */
export const TwentyFourHour: Story = { args: { hourCycle: 24 } };

/** For typing a time instead: the arrow keys step the hour or minute, and typing moves on. */
export const TextFields: Story = { args: { mode: 'input' } };

export const TwentyFourHourFields: Story = { args: { mode: 'input', hourCycle: 24 } };

/** In a short, wide window the clock goes beside the time. */
export const Horizontal: Story = { args: { orientation: 'horizontal' } };

export const WithoutModeToggle: Story = { args: { showModeToggle: false } };

/** `TimePicker` is the surface; reading the value is up to you. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<TimeValue>({ hours: 9, minutes: 5 });
    return (
      <>
        <TimePicker {...args} value={value} onValueChange={setValue} />
        <p>Chosen: {format(value)}</p>
      </>
    );
  },
};

/** The modal: it only reports the time when OK is pressed, and starts afresh each time it opens. */
export const Dialog: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    const [time, setTime] = useState<TimeValue>({ hours: 8, minutes: 30 });
    return (
      <>
        <Button onClick={() => setOpen(true)}>Set alarm: {format(time)}</Button>
        <TimePickerDialog
          {...args}
          open={open}
          onOpenChange={setOpen}
          value={time}
          onConfirm={setTime}
        />
      </>
    );
  },
};

/** Opening the dialog, turning to the minutes and choosing OK: run by the tests, hidden from the sidebar. */
export const DialogInteraction: Story = {
  ...Dialog,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Set alarm/ }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Select time' });
    await waitFor(() => expect(dialog).toBeVisible(), { timeout: 5000 });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  },
};
