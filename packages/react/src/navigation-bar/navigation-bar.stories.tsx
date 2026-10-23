import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
  HomeFilledIcon,
  HomeIcon,
  InboxFilledIcon,
  InboxIcon,
  PersonFilledIcon,
  PersonIcon,
  SearchIcon,
} from '../stories/icons.js';
import {
  NavigationBar,
  NavigationBarItem,
  type NavigationBarLabelBehavior,
  type NavigationBarLayout,
} from './navigation-bar.js';

/** Bars are full-width at the bottom of a window; a fixed frame stands in for one. */
function Frame({ children, width = 360 }: { children: ReactNode; width?: number }) {
  return (
    <div
      style={{
        inlineSize: `min(100vw, ${width}px)`,
        border: '1px solid var(--md-sys-color-outline-variant)',
      }}
    >
      {children}
    </div>
  );
}

const destinations = (extra?: { inboxBadge?: ReactNode; href?: boolean }) => [
  <NavigationBarItem
    key="home"
    value="home"
    label="Home"
    icon={<HomeIcon />}
    activeIcon={<HomeFilledIcon />}
    {...(extra?.href ? { href: '#home' } : {})}
  />,
  <NavigationBarItem
    key="search"
    value="search"
    label="Search"
    icon={<SearchIcon />}
    {...(extra?.href ? { href: '#search' } : {})}
  />,
  <NavigationBarItem
    key="inbox"
    value="inbox"
    label="Inbox"
    icon={<InboxIcon />}
    activeIcon={<InboxFilledIcon />}
    badge={extra?.inboxBadge}
    badgeLabel={extra?.inboxBadge === true ? 'new messages' : undefined}
    {...(extra?.href ? { href: '#inbox' } : {})}
  />,
  <NavigationBarItem
    key="profile"
    value="profile"
    label="Profile"
    icon={<PersonIcon />}
    activeIcon={<PersonFilledIcon />}
    {...(extra?.href ? { href: '#profile' } : {})}
  />,
];

const meta = {
  title: 'Components/NavigationBar',
  component: NavigationBar,
  args: {
    'aria-label': 'Primary',
    defaultValue: 'home',
    onValueChange: fn(),
    children: destinations(),
  },
  argTypes: {
    layout: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'] satisfies NavigationBarLayout[],
    },
    labelBehavior: {
      control: 'inline-radio',
      options: ['always', 'selected', 'never'] satisfies NavigationBarLabelBehavior[],
    },
    children: { control: false },
  },
  decorators: [
    (Story) => (
      <Frame>
        <Story />
      </Frame>
    ),
  ],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof NavigationBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The `Playground` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const PlaygroundInteraction: Story = {
  ...Playground,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('button', { name: 'Search' });
    await expect(search).not.toHaveAttribute('aria-current');
    await userEvent.click(search);
    await expect(search).toHaveAttribute('aria-current', 'page');
    await expect(args.onValueChange).toHaveBeenCalledWith('search');
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState('inbox');
    return (
      <div className="sb-column">
        <NavigationBar {...args} value={value} onValueChange={setValue} />
        <span>Selected: {value}</span>
      </div>
    );
  },
};

export const Layouts: Story = {
  render: (args) => (
    <div className="sb-column">
      <Frame>
        <NavigationBar {...args} layout="vertical" />
      </Frame>
      <Frame width={520}>
        <NavigationBar {...args} layout="horizontal" aria-label="Primary (horizontal)" />
      </Frame>
    </div>
  ),
};

export const LabelBehavior: Story = {
  render: (args) => (
    <div className="sb-column">
      {(['always', 'selected', 'never'] as const).map((labelBehavior) => (
        <Frame key={labelBehavior}>
          <NavigationBar
            {...args}
            labelBehavior={labelBehavior}
            aria-label={`Labels: ${labelBehavior}`}
          />
        </Frame>
      ))}
    </div>
  ),
};

export const Badges: Story = {
  args: { children: destinations({ inboxBadge: 3 }) },
};

export const DotBadge: Story = {
  args: { children: destinations({ inboxBadge: true }) },
};

/** With `href` the items are links, so they work with routers and open in new tabs. */
export const Links: Story = {
  args: { children: destinations({ href: true }) },
};
