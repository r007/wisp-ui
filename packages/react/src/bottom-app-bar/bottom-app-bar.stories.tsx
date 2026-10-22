import type { Meta, StoryObj } from '@storybook/react-vite';
import { Fab } from '../fab/fab.js';
import { IconButton } from '../icon-button/icon-button.js';
import { AddIcon, EditIcon, MoreVertIcon, SearchIcon, ShareIcon } from '../stories/icons.js';
import { BottomAppBar } from './bottom-app-bar.js';

const meta = {
  title: 'Components/Bottom app bar',
  component: BottomAppBar,
  args: { 'aria-label': 'Actions' },
  argTypes: { fab: { control: false }, children: { control: false }, ref: { control: false } },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BottomAppBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const actions = (
  <>
    <IconButton aria-label="Search">
      <SearchIcon />
    </IconButton>
    <IconButton aria-label="Share">
      <ShareIcon />
    </IconButton>
    <IconButton aria-label="More">
      <MoreVertIcon />
    </IconButton>
  </>
);

const LINES = Array.from({ length: 20 }, (_, i) => i + 1);

export const Playground: Story = {
  args: {
    children: actions,
    fab: <Fab aria-label="Compose" variant="tertiary" icon={<EditIcon />} />,
  },
};

export const WithoutFab: Story = { args: { children: actions } };

/** `sticky` keeps the bar at the bottom of whatever scrolls. */
export const Sticky: Story = {
  args: {
    sticky: true,
    children: actions,
    fab: <Fab aria-label="Add" variant="primary" icon={<AddIcon />} />,
  },
  render: (args) => (
    <div style={{ blockSize: 360, overflow: 'auto' }}>
      <div style={{ padding: 16 }}>
        {LINES.map((line) => (
          <p key={line} style={{ margin: '0 0 12px' }}>
            Scrolling content, line {line}.
          </p>
        ))}
      </div>
      <BottomAppBar {...args} />
    </div>
  ),
};
