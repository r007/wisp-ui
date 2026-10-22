import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge.js';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: { a11y: { test: 'todo' } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No label: a small dot. */
export const Dot: Story = {};

export const Count: Story = { args: { children: '3' } };

export const Sizes: Story = {
  render: () => (
    <div className="sb-row">
      <Badge />
      <Badge>1</Badge>
      <Badge>12</Badge>
      <Badge>999+</Badge>
    </div>
  ),
};
