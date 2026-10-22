import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { Sheet } from './sheet.js';

const meta = {
  title: 'Components/Sheet',
  component: Sheet,
  args: { open: false },
  argTypes: {
    side: { control: 'inline-radio', options: ['bottom', 'start', 'end'] },
    open: { control: 'boolean' },
    actions: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A sheet needs a trigger; these stories keep `open` in state, like real use. */
function Demo(props: Partial<React.ComponentProps<typeof Sheet>> & { label: string }) {
  const { label, ...sheet } = props;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      <Sheet {...sheet} open={open} onOpenChange={setOpen}>
        {sheet.children ?? (
          <p style={{ margin: 0 }}>
            Choose how to share this with the people you work with. Drag the handle down, press it,
            or press Escape to close.
          </p>
        )}
      </Sheet>
    </>
  );
}

export const Bottom: Story = {
  render: (args) => <Demo {...args} label="Open bottom sheet" headline="Share" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open bottom sheet' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Share' });
    // It slides in, which needs painted frames: allow for a busy machine running many pages.
    await waitFor(() => expect(dialog).toBeVisible(), { timeout: 5000 });
  },
};

export const Floating: Story = {
  render: (args) => <Demo {...args} label="Open floating sheet" headline="Share" floating />,
};

export const Side: Story = {
  render: (args) => (
    <Demo
      {...args}
      label="Open side sheet"
      side="end"
      headline="Details"
      actions={
        <>
          <Button variant="text">Cancel</Button>
          <Button variant="filled">Save</Button>
        </>
      }
    />
  ),
};

export const LongContent: Story = {
  render: (args) => (
    <Demo {...args} label="Open long sheet" headline="Terms">
      {Array.from({ length: 30 }, (_, index) => index + 1).map((n) => (
        <p key={n} style={{ margin: '0 0 12px' }}>
          Paragraph {n}. The content scrolls inside the sheet; the handle and headline stay put.
        </p>
      ))}
    </Demo>
  ),
};
