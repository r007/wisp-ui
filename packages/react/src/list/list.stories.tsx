import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
  FolderIcon,
  InboxIcon,
  MailIcon,
  PersonIcon,
  SendIcon,
  SettingsIcon,
  StarIcon,
} from '../stories/icons.js';
import { List, ListDivider, ListItem } from './list.js';

const meta = {
  title: 'Components/List',
  component: List,
  args: { 'aria-label': 'Messages' },
  argTypes: { ref: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem headline="Brunch this weekend?" supportingText="I'll be in your neighbourhood" />
      <ListItem headline="Summer BBQ" supportingText="Wish I could come, but I'm out of town" />
    </List>
  ),
};

/** One, two and three lines: 56, 72 and 88px. */
export const Lines: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem headline="One line" />
      <ListItem headline="Two lines" supportingText="Supporting text" />
      <ListItem
        headline="Three lines"
        overline="Overline"
        supportingText="Supporting text that can run on to a second line of its own"
      />
    </List>
  ),
};

export const Leading: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem headline="Icon" supportingText="24px" leading={<InboxIcon />} />
      <ListItem headline="Avatar" supportingText="40px" leadingKind="avatar" leading="AB" />
      <ListItem
        headline="Image"
        supportingText="56px, rounded"
        leadingKind="image"
        leading={
          <div
            style={{
              background: 'var(--md-sys-color-tertiary-container)',
              inlineSize: '100%',
              blockSize: '100%',
            }}
          />
        }
      />
      <ListItem
        headline="Person"
        leadingKind="avatar"
        leading={<PersonIcon />}
        trailing="2 min"
        trailingKind="text"
      />
    </List>
  ),
};

export const Trailing: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem headline="Starred" trailing={<StarIcon />} />
      <ListItem headline="Sent" supportingText="Today" trailing="3" trailingKind="text" />
    </List>
  ),
};

/** Whole rows are buttons or links, with hover, focus and press states. */
export const Interactive: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem headline="Button" leading={<MailIcon />} onClick={fn()} />
      <ListItem headline="Link" leading={<FolderIcon />} href="#folder" />
      <ListItem headline="Disabled" leading={<SettingsIcon />} onClick={fn()} disabled />
    </List>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Button' }));
  },
};

/** A navigation list: the current item is tinted, and marked with `aria-current`. */
export const Selection: Story = {
  render: (args) => {
    const [current, setCurrent] = useState('Inbox');
    return (
      <List {...args} aria-label="Folders">
        {[
          ['Inbox', <InboxIcon key="i" />],
          ['Sent', <SendIcon key="s" />],
          ['Starred', <StarIcon key="st" />],
        ].map(([name, icon]) => (
          <ListItem
            key={String(name)}
            headline={String(name)}
            leading={icon}
            selected={current === name}
            onClick={() => setCurrent(String(name))}
          />
        ))}
      </List>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sent' }));
    await expect(canvas.getByRole('button', { name: 'Sent' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  },
};

export const Dividers: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem headline="Inbox" leading={<InboxIcon />} />
      <ListItem headline="Sent" leading={<SendIcon />} />
      <ListDivider />
      <ListItem headline="Settings" leading={<SettingsIcon />} />
    </List>
  ),
};

/**
 * Expressive: separate segments whose corners open up on hover and round off when pressed.
 * Segments are `surface`, so they sit on a `surface-container`.
 */
export const Segmented: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 8,
          borderRadius: 16,
          background: 'var(--md-sys-color-surface-container)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <List {...args} segmented>
      {['Brunch this weekend?', 'Summer BBQ', 'Oui oui'].map((title, index) => (
        <ListItem
          key={title}
          headline={title}
          supportingText="Supporting text"
          leading={<MailIcon />}
          selected={index === 1}
          onClick={fn()}
        />
      ))}
    </List>
  ),
};
