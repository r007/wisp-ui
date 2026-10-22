import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { IconButton } from '../icon-button/icon-button.js';
import { ArrowBackIcon, MenuIcon, MoreVertIcon, SearchIcon } from '../stories/icons.js';
import { TopAppBar } from './app-bar.js';

const meta = {
  title: 'Components/TopAppBar',
  component: TopAppBar,
  args: { title: 'Inbox' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    navigation: { control: false },
    actions: { control: false },
    scrollTarget: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TopAppBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const Menu = (
  <IconButton aria-label="Menu">
    <MenuIcon />
  </IconButton>
);
const Actions = (
  <>
    <IconButton aria-label="Search">
      <SearchIcon />
    </IconButton>
    <IconButton aria-label="More">
      <MoreVertIcon />
    </IconButton>
  </>
);

export const Small: Story = {
  args: { navigation: Menu, actions: Actions, subtitle: '24 unread' },
};

export const Medium: Story = {
  args: { variant: 'medium', navigation: Menu, actions: Actions },
};

export const Large: Story = {
  args: {
    variant: 'large',
    navigation: (
      <IconButton aria-label="Back">
        <ArrowBackIcon />
      </IconButton>
    ),
    actions: Actions,
    subtitle: '24 unread',
  },
};

/** The bar collapses and lifts as its scroll container scrolls. */
export const Scrolling: Story = {
  render: (args) => {
    const scroller = useRef<HTMLDivElement>(null);
    const [, rerender] = useState(0);
    return (
      <div
        ref={scroller}
        style={{ blockSize: 360, overflow: 'auto' }}
        onScroll={() => rerender((n) => n + 1)}
      >
        <TopAppBar
          {...args}
          variant="large"
          title="Inbox"
          subtitle="24 unread"
          navigation={Menu}
          actions={Actions}
          scrollTarget={scroller}
          sticky
        />
        <div style={{ padding: 16 }}>
          {Array.from({ length: 30 }, (_, index) => index + 1).map((n) => (
            <p key={n} style={{ margin: '0 0 12px' }}>
              Message {n}. Scroll to see the bar collapse.
            </p>
          ))}
        </div>
      </div>
    );
  },
};
