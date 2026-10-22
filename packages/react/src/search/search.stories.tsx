import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { IconButton } from '../icon-button/icon-button.js';
import { List, ListItem } from '../list/list.js';
import { MicIcon, ScheduleIcon } from '../stories/icons.js';
import { Search } from './search.js';

const RECIPES = [
  'Apple pie',
  'Banana bread',
  'Carrot cake',
  'Chicken soup',
  'Lemon tart',
  'Mushroom risotto',
];

const meta = {
  title: 'Components/Search',
  component: Search,
  args: { 'aria-label': 'Search recipes', placeholder: 'Search recipes' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['docked', 'full-screen'] },
    leading: { control: false },
    trailing: { control: false },
    children: { control: false },
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: 600, minBlockSize: 520, margin: '0 auto', padding: 24 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Search>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Suggestions that narrow as the user types; pressing one searches for it. */
function Suggestions({ onPick }: { onPick: (name: string) => void }) {
  return (
    <List aria-label="Suggestions">
      {RECIPES.map((name) => (
        <ListItem
          key={name}
          headline={name}
          leading={<ScheduleIcon />}
          onClick={() => onPick(name)}
        />
      ))}
    </List>
  );
}

export const Playground: Story = {
  render: (args) => {
    const [picked, setPicked] = useState('');
    return (
      <>
        <Search {...args} onSearch={setPicked}>
          <Suggestions onPick={setPicked} />
        </Search>
        <p>{picked ? `Searched for “${picked}”` : 'Press Enter, or pick a suggestion.'}</p>
      </>
    );
  },
};

export const Open: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <Search {...args}>
      <Suggestions onPick={() => {}} />
    </Search>
  ),
};

export const FullScreen: Story = {
  args: { variant: 'full-screen' },
  render: (args) => (
    <Search {...args}>
      <Suggestions onPick={() => {}} />
    </Search>
  ),
};

export const WithActions: Story = {
  args: {
    defaultOpen: true,
    defaultValue: 'tart',
    trailing: (
      <IconButton aria-label="Voice search">
        <MicIcon />
      </IconButton>
    ),
  },
  render: (args) => (
    <Search {...args}>
      <Suggestions onPick={() => {}} />
    </Search>
  ),
};

/** A search with nothing to show beneath the input is just a bar that takes typing. */
export const WithoutResults: Story = { args: { defaultOpen: true } };
