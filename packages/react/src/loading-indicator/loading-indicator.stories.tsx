import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingIndicator } from './loading-indicator.js';
import { pathOf, SHAPES } from './shapes.js';

const meta = {
  title: 'Components/Loading indicator',
  component: LoadingIndicator,
  args: { 'aria-label': 'Loading' },
  argTypes: { ref: { control: false } },
} satisfies Meta<typeof LoadingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Contained: Story = { args: { contained: true } };

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      {[24, 48, 72, 96].map((size) => (
        <LoadingIndicator key={size} {...args} size={size} aria-label={`Loading, ${size}px`} />
      ))}
    </div>
  ),
};

/** The seven shapes it morphs through, in order, each held still. */
export const Shapes: Story = {
  render: () => (
    <ol
      aria-label="The shapes"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        margin: 0,
        padding: 0,
        listStyle: 'none',
      }}
    >
      {SHAPES.map((shape, i) => (
        <li key={pathOf(shape)} style={{ textAlign: 'center' }}>
          <svg
            viewBox="-1 -1 2 2"
            width={72}
            height={72}
            role="img"
            aria-label={`Shape ${i + 1}`}
            style={{ fill: 'var(--md-sys-color-primary)' }}
          >
            <path d={pathOf(shape)} />
          </svg>
        </li>
      ))}
    </ol>
  ),
};
