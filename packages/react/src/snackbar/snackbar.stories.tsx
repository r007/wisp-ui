import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { Snackbar } from './snackbar.js';
import { SnackbarProvider, useSnackbar } from './snackbar-provider.js';

const meta = {
  title: 'Components/Snackbar',
  component: Snackbar,
  args: { open: false, children: 'Message archived', duration: 6000 },
  argTypes: { open: { control: 'boolean' } },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Snackbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A snackbar needs a trigger; these stories keep `open` in state, like real use. */
function Demo(props: Partial<React.ComponentProps<typeof Snackbar>>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Show snackbar</Button>
      <Snackbar duration={6000} {...props} open={open} onOpenChange={setOpen}>
        {props.children ?? 'Message archived'}
      </Snackbar>
    </>
  );
}

export const Playground: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Show snackbar' }));
    const status = await within(document.body).findByRole('status');
    await waitFor(() => expect(status).toBeVisible());
  },
};

export const WithAction: Story = {
  render: (args) => <Demo {...args} actionLabel="Undo" onAction={fn()} />,
};

export const Dismissible: Story = {
  render: (args) => <Demo {...args} actionLabel="Undo" dismissible duration={null} />,
};

export const LongMessage: Story = {
  render: (args) => (
    <Demo {...args} actionLabel="Retry" dismissible duration={null}>
      The upload did not finish because the connection was lost; check your network and try again.
    </Demo>
  ),
};

function Queue() {
  const { show } = useSnackbar();
  return (
    <Button
      onClick={() => {
        show({ message: 'Message archived', actionLabel: 'Undo', duration: 2500 });
      }}
    >
      Queue a message
    </Button>
  );
}

/** Messages queue: only one shows at a time, and the next appears when it has gone. */
export const Queued: Story = {
  render: () => (
    <SnackbarProvider>
      <Queue />
    </SnackbarProvider>
  ),
};
