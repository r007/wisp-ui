import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './divider.js';

const meta = {
  title: 'Components/Divider',
  component: Divider,
  argTypes: { ref: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Insets: Story = {
  render: () => (
    <div className="sb-column" style={{ inlineSize: 320 }}>
      {(['none', 'start', 'end', 'both'] as const).map((inset) => (
        <div key={inset} style={{ inlineSize: '100%' }}>
          <p style={{ margin: '0 0 8px' }}>{inset}</p>
          <Divider inset={inset === 'none' ? undefined : inset} />
        </div>
      ))}
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="sb-row" style={{ blockSize: 40, gap: 16 }}>
      <span>Left</span>
      <Divider vertical />
      <span>Right</span>
    </div>
  ),
};
