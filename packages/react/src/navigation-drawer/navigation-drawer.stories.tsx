import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { IconButton } from '../icon-button/icon-button.js';
import {
  BookmarkIcon,
  InboxFilledIcon,
  InboxIcon,
  MenuIcon,
  SendIcon,
  SettingsIcon,
  StarIcon,
} from '../stories/icons.js';
import {
  NavigationDrawer,
  NavigationDrawerDivider,
  NavigationDrawerItem,
  NavigationDrawerSection,
} from './navigation-drawer.js';

function Destinations() {
  return (
    <>
      <NavigationDrawerSection headline="Mail">
        <NavigationDrawerItem value="inbox" label="Inbox" icon={<InboxIcon />} badge="24" />
        <NavigationDrawerItem value="outbox" label="Outbox" icon={<SendIcon />} />
        <NavigationDrawerItem value="favourites" label="Favourites" icon={<StarIcon />} />
        <NavigationDrawerItem value="trash" label="Bookmarks" icon={<BookmarkIcon />} />
      </NavigationDrawerSection>
      <NavigationDrawerDivider />
      <NavigationDrawerSection headline="Labels">
        <NavigationDrawerItem value="settings" label="Settings" icon={<SettingsIcon />} />
      </NavigationDrawerSection>
    </>
  );
}

const meta = {
  title: 'Components/NavigationDrawer',
  component: NavigationDrawer,
  args: { 'aria-label': 'Main', defaultValue: 'inbox', children: <Destinations /> },
  argTypes: {
    variant: { control: 'inline-radio', options: ['standard', 'modal'] },
    children: { control: false },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NavigationDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Part of the page layout, next to the content. */
export const Standard: Story = {
  render: (args) => (
    <div style={{ display: 'flex', blockSize: '100vh' }}>
      <NavigationDrawer {...args} variant="standard" />
      <main style={{ padding: 24 }}>
        <h1 style={{ margin: 0, font: 'var(--md-sys-typescale-headline-small)' }}>Inbox</h1>
      </main>
    </div>
  ),
};

/**
 * A native dialog over a scrim. Escape, the scrim and choosing a destination all
 * ask the parent to close it, so it stays controlled.
 */
export const Modal: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <IconButton aria-label="Open navigation" variant="tonal" onClick={() => setOpen(true)}>
          <MenuIcon />
        </IconButton>
        <NavigationDrawer {...args} variant="modal" open={open} onOpenChange={setOpen} />
      </div>
    );
  },
};

/** The `Modal` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const ModalInteraction: Story = {
  ...Modal,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open navigation' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Main' });
    await expect(dialog).toHaveAttribute('open');
    // Choosing a destination dismisses the drawer. (Escape is covered by the unit
    // tests: Storybook's synthetic key events do not trigger a native dialog cancel.)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Outbox' }));
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  },
};

export const WithSwappedIcons: Story = {
  render: (args) => (
    <div style={{ display: 'flex', blockSize: '100vh' }}>
      <NavigationDrawer {...args} variant="standard">
        <NavigationDrawerSection>
          <NavigationDrawerItem value="inbox" label="Inbox" icon={<InboxFilledIcon />} />
          <NavigationDrawerItem value="outbox" label="Outbox" icon={<SendIcon />} />
        </NavigationDrawerSection>
      </NavigationDrawer>
    </div>
  ),
};
