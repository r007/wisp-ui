import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { FavoriteIcon, FlightIcon, HomeIcon, SettingsIcon } from '../stories/icons.js';
import { Tab, TabList, TabPanel, Tabs } from './tabs.js';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  args: { defaultValue: 'flights' },
  argTypes: { ref: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const Panels = () => (
  <>
    <TabPanel value="flights" style={{ padding: 16 }}>
      Flight deals
    </TabPanel>
    <TabPanel value="hotels" style={{ padding: 16 }}>
      Hotel deals
    </TabPanel>
    <TabPanel value="trips" style={{ padding: 16 }}>
      Trips
    </TabPanel>
  </>
);

export const Primary: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabList aria-label="Trips">
        <Tab value="flights">Flights</Tab>
        <Tab value="hotels">Hotels</Tab>
        <Tab value="trips">Trips</Tab>
      </TabList>
      <Panels />
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: 'Hotels' }));
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Hotel deals');
  },
};

export const Secondary: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabList aria-label="Trips" variant="secondary">
        <Tab value="flights">Flights</Tab>
        <Tab value="hotels">Hotels</Tab>
        <Tab value="trips">Trips</Tab>
      </TabList>
      <Panels />
    </Tabs>
  ),
};

/** On a primary tab an icon sits above the label. */
export const WithIcons: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabList aria-label="Trips">
        <Tab value="flights" icon={<FlightIcon />}>
          Flights
        </Tab>
        <Tab value="hotels" icon={<HomeIcon />}>
          Hotels
        </Tab>
        <Tab value="trips" icon={<FavoriteIcon />}>
          Trips
        </Tab>
      </TabList>
      <Panels />
    </Tabs>
  ),
};

/** Icon-only tabs are named with `aria-label`. */
export const IconOnly: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabList aria-label="Sections">
        <Tab value="flights" icon={<FlightIcon />} aria-label="Flights" />
        <Tab value="hotels" icon={<HomeIcon />} aria-label="Hotels" />
        <Tab value="trips" icon={<SettingsIcon />} aria-label="Settings" />
      </TabList>
      <Panels />
    </Tabs>
  ),
};

/** Many tabs scroll, each as wide as its label. */
export const Scrollable: Story = {
  render: (args) => (
    <Tabs {...args} defaultValue="three">
      <TabList aria-label="Scrolling tabs" scrollable>
        {['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'].map((name) => (
          <Tab key={name} value={name.toLowerCase()}>
            Section {name}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  ),
};
