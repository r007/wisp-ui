import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Checkbox } from './checkbox.js';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { 'aria-label': 'Remember me', onCheckedChange: fn() },
  argTypes: { ref: { control: false } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: (args) => (
    <div className="sb-column">
      <div className="sb-row">
        <Checkbox {...args} aria-label="Unchecked" />
        <Checkbox {...args} aria-label="Checked" defaultChecked />
        <Checkbox {...args} aria-label="Indeterminate" indeterminate />
      </div>
      <div className="sb-row">
        <Checkbox {...args} aria-label="Error unchecked" error />
        <Checkbox {...args} aria-label="Error checked" error defaultChecked />
        <Checkbox {...args} aria-label="Error indeterminate" error indeterminate />
      </div>
      <div className="sb-row">
        <Checkbox {...args} aria-label="Disabled unchecked" disabled />
        <Checkbox {...args} aria-label="Disabled checked" disabled defaultChecked />
        <Checkbox {...args} aria-label="Disabled indeterminate" disabled indeterminate />
      </div>
    </div>
  ),
};

/** Wrap the checkbox in a `<label>`: clicking the text toggles it, and it names the checkbox. */
export const WithLabel: Story = {
  args: { 'aria-label': undefined },
  render: (args) => (
    <label className="sb-row" style={{ cursor: 'pointer' }}>
      <Checkbox {...args} />
      Remember me
    </label>
  ),
};

/** The `WithLabel` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const WithLabelInteraction: Story = {
  ...WithLabel,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole('checkbox', { name: 'Remember me' });
    await expect(box).not.toBeChecked();
    await userEvent.click(canvas.getByText('Remember me'));
    await expect(box).toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true);
  },
};

/** The classic "select all": the parent is mixed while only some children are checked. */
export const SelectAll: Story = {
  render: () => {
    const [items, setItems] = useState({ Inbox: true, Drafts: false, Sent: true });
    const values = Object.values(items);
    const all = values.every(Boolean);
    const none = values.every((value) => !value);
    return (
      <div className="sb-column">
        <label className="sb-row">
          <Checkbox
            checked={all}
            indeterminate={!all && !none}
            onCheckedChange={(checked) =>
              setItems({ Inbox: checked, Drafts: checked, Sent: checked })
            }
          />
          Select all
        </label>
        {Object.entries(items).map(([name, checked]) => (
          <label key={name} className="sb-row" style={{ paddingInlineStart: 32 }}>
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => setItems({ ...items, [name]: next })}
            />
            {name}
          </label>
        ))}
      </div>
    );
  },
};

export const KeyboardOperable: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox');
    await userEvent.tab();
    await expect(box).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(box).toBeChecked();
  },

  tags: ['!dev', '!autodocs'],
};
