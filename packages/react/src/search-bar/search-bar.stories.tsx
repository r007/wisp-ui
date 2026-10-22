import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { IconButton } from '../icon-button/icon-button.js';
import { ArrowBackIcon, MicIcon, MoreVertIcon } from '../stories/icons.js';
import { SearchBar } from './search-bar.js';

const meta = {
  title: 'Components/Search bar',
  component: SearchBar,
  args: { 'aria-label': 'Search recipes', placeholder: 'Search recipes' },
  argTypes: { leading: { control: false }, trailing: { control: false }, ref: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: 560, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithActions: Story = {
  args: {
    trailing: (
      <>
        <IconButton aria-label="Voice search">
          <MicIcon />
        </IconButton>
        <IconButton aria-label="More options">
          <MoreVertIcon />
        </IconButton>
      </>
    ),
  },
};

export const CustomLeadingIcon: Story = {
  args: {
    leading: <ArrowBackIcon />,
  },
};

/** Searching on Enter. */
export const Searching: Story = {
  render: (args) => {
    const [last, setLast] = useState('');
    return (
      <>
        <SearchBar {...args} onSearch={setLast} />
        <p>{last ? `Searched for “${last}”` : 'Press Enter to search.'}</p>
      </>
    );
  },
};
