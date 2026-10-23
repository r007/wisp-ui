import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Switch } from './switch.js';

const meta = {
  title: 'Components/Switch',
  component: Switch,
  args: { 'aria-label': 'Wi-Fi', onCheckedChange: fn() },
  argTypes: { ref: { control: false } },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: (args) => (
    <div className="sb-column">
      <div className="sb-row">
        <Switch {...args} aria-label="Off" />
        <Switch {...args} aria-label="On" defaultChecked />
      </div>
      <div className="sb-row">
        <Switch {...args} aria-label="Off with icons" icons />
        <Switch {...args} aria-label="On with icons" icons defaultChecked />
      </div>
      <div className="sb-row">
        <Switch {...args} aria-label="Disabled off" disabled />
        <Switch {...args} aria-label="Disabled on" disabled defaultChecked />
        <Switch {...args} aria-label="Disabled off with icons" icons disabled />
        <Switch {...args} aria-label="Disabled on with icons" icons disabled defaultChecked />
      </div>
    </div>
  ),
};

/** Wrap the switch in a `<label>`: clicking the text toggles it, and it names the switch. */
export const WithLabel: Story = {
  args: { 'aria-label': undefined },
  render: (args) => (
    <label className="sb-row" style={{ cursor: 'pointer' }}>
      <Switch {...args} icons />
      Airplane mode
    </label>
  ),
};

/** The `WithLabel` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const WithLabelInteraction: Story = {
  ...WithLabel,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('switch', { name: 'Airplane mode' });
    await expect(toggle).not.toBeChecked();
    await userEvent.click(canvas.getByText('Airplane mode'));
    await expect(toggle).toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true);
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [on, setOn] = useState(true);
    return (
      <label className="sb-row">
        <Switch {...args} aria-label={undefined} checked={on} onCheckedChange={setOn} />
        {on ? 'On' : 'Off'}
      </label>
    );
  },
};

export const KeyboardOperable: Story = {
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole('switch');
    await userEvent.tab();
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(toggle).toBeChecked();
  },

  tags: ['!dev', '!autodocs'],
};
