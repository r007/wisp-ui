import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Radio } from './radio.js';
import { RadioGroup } from './radio-group.js';

const meta = {
  title: 'Components/Radio',
  component: Radio,
  args: { 'aria-label': 'Small' },
  argTypes: { ref: { control: false } },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: (args) => (
    <div className="sb-column">
      <div className="sb-row">
        <Radio {...args} aria-label="Unselected" name="a" />
        <Radio {...args} aria-label="Selected" name="b" defaultChecked />
      </div>
      <div className="sb-row">
        <Radio {...args} aria-label="Disabled unselected" name="c" disabled />
        <Radio {...args} aria-label="Disabled selected" name="d" disabled defaultChecked />
      </div>
    </div>
  ),
};

/** A group owns the selection and gives its radios one `name`, so the arrow keys move between them. */
export const Group: Story = {
  render: () => (
    <RadioGroup aria-label="Size" defaultValue="m" onValueChange={fn()}>
      {['Small', 'Medium', 'Large'].map((label) => (
        <label key={label} className="sb-row" style={{ cursor: 'pointer' }}>
          <Radio value={label[0]?.toLowerCase()} />
          {label}
        </label>
      ))}
    </RadioGroup>
  ),
};

/** The `Group` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const GroupInteraction: Story = {
  ...Group,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('radio', { name: 'Medium' })).toBeChecked();
    await userEvent.click(canvas.getByText('Large'));
    await expect(canvas.getByRole('radio', { name: 'Large' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Medium' })).not.toBeChecked();
  },
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('express');
    return (
      <div className="sb-column">
        <RadioGroup aria-label="Delivery" value={value} onValueChange={setValue}>
          <label className="sb-row">
            <Radio value="standard" /> Standard
          </label>
          <label className="sb-row">
            <Radio value="express" /> Express
          </label>
        </RadioGroup>
        <span>Selected: {value}</span>
      </div>
    );
  },
};

export const DisabledGroup: Story = {
  render: () => (
    <RadioGroup aria-label="Plan" disabled defaultValue="free">
      <label className="sb-row">
        <Radio value="free" /> Free
      </label>
      <label className="sb-row">
        <Radio value="pro" /> Pro
      </label>
    </RadioGroup>
  ),
};

export const KeyboardOperable: Story = {
  render: () => (
    <RadioGroup aria-label="Size" defaultValue="s">
      <Radio value="s" aria-label="Small" />
      <Radio value="l" aria-label="Large" />
    </RadioGroup>
  ),
};

/** The `KeyboardOperable` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const KeyboardOperableInteraction: Story = {
  ...KeyboardOperable,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: 'Small' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('radio', { name: 'Large' })).toBeChecked();
  },
};
