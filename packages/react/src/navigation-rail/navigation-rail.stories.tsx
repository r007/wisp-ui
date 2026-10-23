import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import {
  FavoriteFilledIcon,
  FavoriteIcon,
  HomeFilledIcon,
  HomeIcon,
  MenuIcon,
  PersonFilledIcon,
  PersonIcon,
  SettingsFilledIcon,
  SettingsIcon,
} from '../stories/icons.js';
import { NavigationRail, NavigationRailItem } from './navigation-rail.js';

const meta = {
  title: 'Components/NavigationRail',
  component: NavigationRail,
  args: { 'aria-label': 'Main', defaultValue: 'home' },
  argTypes: { header: { control: false }, ref: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ blockSize: 480, display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof NavigationRail>;

export default meta;
type Story = StoryObj<typeof meta>;

const Destinations = () => (
  <>
    <NavigationRailItem
      value="home"
      label="Home"
      icon={<HomeIcon />}
      activeIcon={<HomeFilledIcon />}
    />
    <NavigationRailItem
      value="favourites"
      label="Favourites"
      icon={<FavoriteIcon />}
      activeIcon={<FavoriteFilledIcon />}
      badge={3}
    />
    <NavigationRailItem
      value="people"
      label="People"
      icon={<PersonIcon />}
      activeIcon={<PersonFilledIcon />}
    />
    <NavigationRailItem
      value="settings"
      label="Settings"
      icon={<SettingsIcon />}
      activeIcon={<SettingsFilledIcon />}
    />
  </>
);

export const Collapsed: Story = {
  render: (args) => (
    <NavigationRail
      {...args}
      header={<Button variant="text" icon={<MenuIcon />} aria-label="Menu" />}
    >
      <Destinations />
    </NavigationRail>
  ),
};

/** The `Collapsed` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const CollapsedInteraction: Story = {
  ...Collapsed,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'People' }));
    await expect(canvas.getByRole('button', { name: 'People' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

export const Expanded: Story = {
  render: (args) => (
    <NavigationRail {...args} expanded>
      <Destinations />
    </NavigationRail>
  ),
};

/** The same rail, collapsed and expanded with one control. */
export const Toggling: Story = {
  render: (args) => {
    const [expanded, setExpanded] = useState(false);
    return (
      <NavigationRail
        {...args}
        expanded={expanded}
        header={
          <IconButton aria-label="Toggle menu" onClick={() => setExpanded(!expanded)}>
            <MenuIcon />
          </IconButton>
        }
      >
        <Destinations />
      </NavigationRail>
    );
  },
};

export const Narrow: Story = {
  render: (args) => (
    <NavigationRail {...args} narrow>
      <Destinations />
    </NavigationRail>
  ),
};

export const SelectedLabelsOnly: Story = {
  render: (args) => (
    <NavigationRail {...args} labelBehavior="selected">
      <Destinations />
    </NavigationRail>
  ),
};
