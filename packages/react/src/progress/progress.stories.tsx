import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { CircularProgress } from './circular-progress.js';
import { LinearProgress } from './linear-progress.js';

const meta = {
  title: 'Components/Progress',
  component: LinearProgress,
  args: { 'aria-label': 'Progress', value: 60 },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    ref: { control: false },
  },
} satisfies Meta<typeof LinearProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

const Wide = ({ children }: { children: React.ReactNode }) => (
  <div style={{ inlineSize: 320 }}>{children}</div>
);

export const Linear: Story = {
  render: (args) => (
    <Wide>
      <LinearProgress {...args} />
    </Wide>
  ),
};

export const LinearVariants: Story = {
  render: (args) => (
    <Wide>
      <div className="sb-column" style={{ inlineSize: '100%', gap: 24 }}>
        <LinearProgress {...args} aria-label="Flat" style={{ inlineSize: '100%' }} />
        <LinearProgress {...args} aria-label="Wavy" wavy style={{ inlineSize: '100%' }} />
        <LinearProgress
          {...args}
          aria-label="Flat indeterminate"
          value={undefined}
          style={{ inlineSize: '100%' }}
        />
        <LinearProgress
          {...args}
          aria-label="Wavy indeterminate"
          wavy
          value={undefined}
          style={{ inlineSize: '100%' }}
        />
        <LinearProgress {...args} aria-label="Empty" value={0} style={{ inlineSize: '100%' }} />
        <LinearProgress
          {...args}
          aria-label="Complete"
          value={100}
          style={{ inlineSize: '100%' }}
        />
      </div>
    </Wide>
  ),
};

export const Circular: Story = {
  render: (args) => (
    <div className="sb-row" style={{ gap: 32 }}>
      <CircularProgress aria-label="Flat" value={args.value} />
      <CircularProgress aria-label="Wavy" value={args.value} wavy />
      <CircularProgress aria-label="Flat indeterminate" />
      <CircularProgress aria-label="Wavy indeterminate" wavy />
    </div>
  ),
};

/** The bar and the arc animate between values. */
export const Animated: Story = {
  render: () => {
    const [value, setValue] = useState(10);
    useEffect(() => {
      const timer = setInterval(
        () => setValue((current) => (current >= 100 ? 0 : current + 15)),
        900,
      );
      return () => clearInterval(timer);
    }, []);
    return (
      <div className="sb-column" style={{ gap: 24 }}>
        <Wide>
          <LinearProgress aria-label="Download" value={value} wavy />
        </Wide>
        <CircularProgress aria-label="Download" value={value} />
      </div>
    );
  },
};
