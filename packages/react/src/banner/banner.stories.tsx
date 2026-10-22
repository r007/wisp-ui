import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../button/button.js';
import { WifiIcon } from '../stories/icons.js';
import { Banner } from './banner.js';

const meta = {
  title: 'Components/Banner',
  component: Banner,
  args: { children: 'You are offline. Changes will sync when you reconnect.' },
  argTypes: { icon: { control: false }, actions: { control: false }, ref: { control: false } },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { actions: <Button variant="text">Dismiss</Button> },
};

export const WithIconAndActions: Story = {
  args: {
    icon: <WifiIcon />,
    actions: (
      <>
        <Button variant="text">Dismiss</Button>
        <Button variant="text">Learn more</Button>
      </>
    ),
  },
};

/** A banner folds away instead of vanishing, and is out of the tab order once closed. */
export const Dismissible: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Banner
          {...args}
          open={open}
          actions={
            <Button variant="text" onClick={() => setOpen(false)}>
              Dismiss
            </Button>
          }
        />
        <div style={{ padding: 16 }}>
          <Button variant="tonal" onClick={() => setOpen(true)}>
            Show the banner
          </Button>
        </div>
      </>
    );
  },
};
