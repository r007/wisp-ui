import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { VolumeUpIcon } from '../stories/icons.js';
import { Slider, type SliderSize } from './slider.js';

const SIZES: SliderSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];

const meta = {
  title: 'Components/Slider',
  component: Slider,
  args: { 'aria-label': 'Volume', defaultValue: 40 },
  argTypes: {
    size: { control: 'select', options: SIZES },
    icon: { control: false },
    ref: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 320, paddingBlock: 48 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const slider = within(canvasElement).getByRole('slider');
    slider.focus();
    await expect(slider).toHaveFocus();
    // Moving it with the keys is covered by the unit tests: Storybook's key events are synthetic,
    // and the browser only moves a native range input for real ones.
  },
};

/** The track thickens with the size: 16, 24, 40, 56 and 96px. */
export const Sizes: Story = {
  render: (args) => (
    <div className="sb-column" style={{ inlineSize: '100%', gap: 24 }}>
      {SIZES.map((size) => (
        <div key={size} style={{ inlineSize: '100%' }}>
          <Slider {...args} size={size} aria-label={size} />
        </div>
      ))}
    </div>
  ),
};

/** The medium and larger sizes have room for an icon in the active track. */
export const WithIcon: Story = {
  render: (args) => (
    <div className="sb-column" style={{ inlineSize: '100%', gap: 24 }}>
      {(['medium', 'large', 'xlarge'] as const).map((size) => (
        <div key={size} style={{ inlineSize: '100%' }}>
          <Slider {...args} size={size} icon={<VolumeUpIcon />} aria-label={size} />
        </div>
      ))}
    </div>
  ),
};

export const Formatted: Story = {
  render: (args) => {
    const [value, setValue] = useState(60);
    return (
      <Slider
        {...args}
        value={value}
        onValueChange={setValue}
        min={0}
        max={100}
        step={5}
        formatValue={(v) => `${v}%`}
      />
    );
  },
};

export const Disabled: Story = {
  render: (args) => (
    <div style={{ inlineSize: '100%' }}>
      <Slider {...args} disabled />
    </div>
  ),
};
