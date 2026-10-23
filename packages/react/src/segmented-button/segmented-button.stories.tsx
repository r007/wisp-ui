import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { HomeIcon, MailIcon, SettingsIcon } from '../stories/icons.js';
import { SegmentedButton, SegmentedButtonItem } from './segmented-button.js';

const meta = {
  title: 'Components/SegmentedButton',
  component: SegmentedButton,
  args: { 'aria-label': 'View', children: null },
  argTypes: { ref: { control: false }, children: { control: false } },
} satisfies Meta<typeof SegmentedButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleSelect: Story = {
  render: (args) => (
    <SegmentedButton {...args} defaultValue="week">
      <SegmentedButtonItem value="day">Day</SegmentedButtonItem>
      <SegmentedButtonItem value="week">Week</SegmentedButtonItem>
      <SegmentedButtonItem value="month">Month</SegmentedButtonItem>
    </SegmentedButton>
  ),
};

/** The `SingleSelect` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const SingleSelectInteraction: Story = {
  ...SingleSelect,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Month'));
    await expect(canvas.getByRole('radio', { name: 'Month' })).toBeChecked();
  },
};

/** Several segments can be on at once; they are checkboxes. */
export const MultiSelect: Story = {
  render: (args) => (
    <SegmentedButton {...args} multiple defaultValue={['bold']} aria-label="Format">
      <SegmentedButtonItem value="bold">Bold</SegmentedButtonItem>
      <SegmentedButtonItem value="italic">Italic</SegmentedButtonItem>
      <SegmentedButtonItem value="underline">Underline</SegmentedButtonItem>
    </SegmentedButton>
  ),
};

/** A segment's own icon is replaced by a check while it is selected. */
export const WithIcons: Story = {
  render: (args) => (
    <SegmentedButton {...args} defaultValue="home" aria-label="Section">
      <SegmentedButtonItem value="home" icon={<HomeIcon />}>
        Home
      </SegmentedButtonItem>
      <SegmentedButtonItem value="mail" icon={<MailIcon />}>
        Mail
      </SegmentedButtonItem>
      <SegmentedButtonItem value="settings" icon={<SettingsIcon />}>
        Settings
      </SegmentedButtonItem>
    </SegmentedButton>
  ),
};

export const IconOnly: Story = {
  render: (args) => (
    <SegmentedButton {...args} defaultValue="home" aria-label="Section">
      <SegmentedButtonItem value="home" icon={<HomeIcon />} aria-label="Home" />
      <SegmentedButtonItem value="mail" icon={<MailIcon />} aria-label="Mail" />
    </SegmentedButton>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="sb-column">
      <SegmentedButton {...args} disabled defaultValue="week">
        <SegmentedButtonItem value="day">Day</SegmentedButtonItem>
        <SegmentedButtonItem value="week">Week</SegmentedButtonItem>
      </SegmentedButton>
      <SegmentedButton {...args} defaultValue="day">
        <SegmentedButtonItem value="day">Day</SegmentedButtonItem>
        <SegmentedButtonItem value="week" disabled>
          Week
        </SegmentedButtonItem>
        <SegmentedButtonItem value="month">Month</SegmentedButtonItem>
      </SegmentedButton>
    </div>
  ),
};
