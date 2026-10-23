import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { ArrowBackIcon, DeleteIcon } from '../stories/icons.js';
import { Dialog } from './dialog.js';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
  args: { open: false },
  argTypes: {
    open: { control: 'boolean' },
    variant: { control: 'inline-radio', options: ['basic', 'fullscreen'] },
    role: { control: 'inline-radio', options: ['dialog', 'alertdialog'] },
    icon: { control: false },
    navigation: { control: false },
    actions: { control: false },
    ref: { control: false },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const paragraphs = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

/** A dialog needs a trigger; these stories keep `open` in state, like real use. */
function Demo(props: Partial<React.ComponentProps<typeof Dialog>> & { label?: string }) {
  const { label = 'Open dialog', ...dialogProps } = props;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      <Dialog
        headline="Discard draft?"
        {...dialogProps}
        open={open}
        onOpenChange={setOpen}
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="text" onClick={() => setOpen(false)}>
              Discard
            </Button>
          </>
        }
      >
        {dialogProps.children ?? 'Your draft will be deleted and cannot be recovered.'}
      </Dialog>
    </>
  );
}

export const Playground: Story = {
  render: (args) => <Demo {...args} />,
};

/** The `Playground` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const PlaygroundInteraction: Story = {
  ...Playground,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Discard draft?' });
    await expect(dialog).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  },
};

export const WithIcon: Story = {
  render: (args) => <Demo {...args} icon={<DeleteIcon />} headline="Delete this draft?" />,
};

export const Alert: Story = {
  render: (args) => (
    <Demo {...args} role="alertdialog" headline="Reset settings?" label="Open alert dialog">
      Every setting returns to its default. This cannot be undone.
    </Demo>
  ),
};

export const LongContent: Story = {
  render: (args) => (
    <Demo {...args} headline="Terms of service" label="Open long dialog">
      {paragraphs(30).map((number) => (
        <p key={number} style={{ margin: '0 0 12px' }}>
          Paragraph {number}. The content scrolls inside the dialog while the headline and actions
          stay in view.
        </p>
      ))}
    </Demo>
  ),
};

export const Fullscreen: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open full-screen dialog</Button>
        <Dialog
          {...args}
          variant="fullscreen"
          headline="New event"
          open={open}
          onOpenChange={setOpen}
          navigation={
            <IconButton aria-label="Close" onClick={() => setOpen(false)}>
              <ArrowBackIcon />
            </IconButton>
          }
          actions={
            <Button variant="text" onClick={() => setOpen(false)}>
              Save
            </Button>
          }
        >
          {paragraphs(40).map((number) => (
            <p key={number} style={{ margin: '0 0 12px' }}>
              Field {number}. Scroll to see the header lift.
            </p>
          ))}
        </Dialog>
      </>
    );
  },
};
