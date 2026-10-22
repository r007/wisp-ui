import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { DeleteIcon, EditIcon, MoreVertIcon, ShareIcon, StarIcon } from '../stories/icons.js';
import { Menu, MenuDivider, MenuItem } from './menu.js';

const meta = {
  title: 'Components/Menu',
  component: Menu,
  args: { trigger: <Button variant="outlined">Options</Button>, children: null },
  argTypes: {
    scheme: { control: 'inline-radio', options: ['standard', 'vibrant'] },
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
    },
    trigger: { control: false },
    children: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ minBlockSize: 320, minInlineSize: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Menu {...args}>
      <MenuItem leading={<EditIcon />} onClick={fn()}>
        Edit
      </MenuItem>
      <MenuItem leading={<ShareIcon />} onClick={fn()}>
        Share
      </MenuItem>
      <MenuItem leading={<DeleteIcon />} onClick={fn()}>
        Delete
      </MenuItem>
    </Menu>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Options' }));
    const edit = await within(document.body).findByRole('menuitem', { name: 'Edit' });
    // It fades in, which needs painted frames: allow for a busy machine running many pages.
    await waitFor(() => expect(edit).toBeVisible(), { timeout: 5000 });
  },
};

export const Vibrant: Story = {
  render: (args) => (
    <Menu {...args} scheme="vibrant" defaultOpen>
      <MenuItem leading={<EditIcon />}>Edit</MenuItem>
      <MenuItem leading={<StarIcon />}>Favourite</MenuItem>
      <MenuItem leading={<DeleteIcon />}>Delete</MenuItem>
    </Menu>
  ),
};

/** Icon buttons open menus too: they carry their own accessible name. */
export const IconTrigger: Story = {
  render: (args) => (
    <Menu
      {...args}
      trigger={
        <IconButton aria-label="More">
          <MoreVertIcon />
        </IconButton>
      }
      placement="bottom-end"
    >
      <MenuItem>Mark as read</MenuItem>
      <MenuItem>Archive</MenuItem>
      <MenuDivider />
      <MenuItem disabled>Move to…</MenuItem>
    </Menu>
  ),
};

/** Checkbox items toggle and, with `keepOpen`, leave the menu open so several can be changed. */
export const Checkboxes: Story = {
  render: (args) => {
    const [checked, setChecked] = useState({ Toolbar: true, Sidebar: false, 'Status bar': true });
    return (
      <Menu {...args} trigger={<Button variant="tonal">View</Button>}>
        {Object.entries(checked).map(([name, on]) => (
          <MenuItem
            key={name}
            role="menuitemcheckbox"
            checked={on}
            keepOpen
            onClick={() => setChecked({ ...checked, [name]: !on })}
          >
            {name}
          </MenuItem>
        ))}
      </Menu>
    );
  },
};

/** Shortcuts and other trailing text. */
export const TrailingText: Story = {
  render: (args) => (
    <Menu {...args} defaultOpen>
      <MenuItem leading={<EditIcon />} trailing="⌘E" trailingKind="text">
        Edit
      </MenuItem>
      <MenuItem leading={<ShareIcon />} trailing="⌘⇧S" trailingKind="text">
        Share
      </MenuItem>
    </Menu>
  ),
};
