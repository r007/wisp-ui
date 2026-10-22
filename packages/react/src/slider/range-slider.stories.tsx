import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RangeSlider } from './range-slider.js';

const meta = {
  title: 'Components/Range slider',
  component: RangeSlider,
  args: { 'aria-label': 'Price', defaultValue: [20, 60] },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
    },
    value: { control: false },
    defaultValue: { control: false },
    ref: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 360, paddingBlock: 56 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      {(['xsmall', 'small', 'medium', 'large', 'xlarge'] as const).map((size) => (
        <RangeSlider key={size} {...args} size={size} aria-label={`Price, ${size}`} />
      ))}
    </div>
  ),
};

export const WithFormattedValues: Story = {
  args: { formatValue: (value) => `$${value}`, max: 200, defaultValue: [40, 120], step: 5 },
};

export const MinimumDistance: Story = {
  args: { minDistance: 10, defaultValue: [40, 60] },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<[number, number]>([30, 70]);
    return (
      <>
        <RangeSlider {...args} value={value} onValueChange={setValue} />
        <p>
          {value[0]} to {value[1]}
        </p>
      </>
    );
  },
};

export const Disabled: Story = { args: { disabled: true } };
