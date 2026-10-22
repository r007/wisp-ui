import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AddIcon, AttachFileIcon, EditIcon, ImageIcon, MicIcon } from '../stories/icons.js';
import { FabMenu, FabMenuItem } from './fab-menu.js';

const meta = {
  title: 'Components/FAB menu',
  component: FabMenu,
  args: { 'aria-label': 'Create', icon: <AddIcon /> },
  argTypes: {
    color: { control: 'inline-radio', options: ['primary', 'secondary', 'tertiary'] },
    size: { control: 'inline-radio', options: ['default', 'medium', 'large'] },
    icon: { control: false },
    closeIcon: { control: false },
    children: { control: false },
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    // A FAB menu lives at a screen corner; the menu opens upward from it.
    (Story) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          minBlockSize: 420,
          padding: 24,
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FabMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = (
  <>
    <FabMenuItem icon={<EditIcon />}>Compose</FabMenuItem>
    <FabMenuItem icon={<ImageIcon />}>Photo</FabMenuItem>
    <FabMenuItem icon={<MicIcon />}>Voice note</FabMenuItem>
    <FabMenuItem icon={<AttachFileIcon />}>Document</FabMenuItem>
  </>
);

export const Playground: Story = { args: { children: items } };

export const Open: Story = { args: { children: items, defaultOpen: true } };

export const Secondary: Story = {
  args: { children: items, color: 'secondary', defaultOpen: true },
};

export const Tertiary: Story = { args: { children: items, color: 'tertiary', defaultOpen: true } };

/** The closed button can be any FAB size; open, it is always the 56px close button. */
export const Large: Story = { args: { children: items, size: 'large' } };

/** Choosing an item runs its action and closes the menu. */
export const WithActions: Story = {
  args: { children: items },
  render: (args) => {
    const [last, setLast] = useState('Nothing yet');
    return (
      <>
        <p style={{ position: 'absolute', insetInlineStart: 24, insetBlockStart: 24, margin: 0 }}>
          Chose: {last}
        </p>
        <FabMenu {...args}>
          {['Compose', 'Photo', 'Voice note'].map((label) => (
            <FabMenuItem key={label} icon={<EditIcon />} onClick={() => setLast(label)}>
              {label}
            </FabMenuItem>
          ))}
        </FabMenu>
      </>
    );
  },
};
