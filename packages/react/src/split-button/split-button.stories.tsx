import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { MenuItem } from '../menu/menu.js';
import { EditIcon } from '../stories/icons.js';
import { SplitButton, type SplitButtonVariant } from './split-button.js';

const VARIANTS: SplitButtonVariant[] = ['elevated', 'filled', 'tonal', 'outlined'];

const meta = {
  title: 'Components/SplitButton',
  component: SplitButton,
  args: {
    children: 'Save',
    menuLabel: 'More save options',
    onClick: fn(),
    menu: (
      <>
        <MenuItem>Save as…</MenuItem>
        <MenuItem>Save a copy</MenuItem>
        <MenuItem>Export</MenuItem>
      </>
    ),
  },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: ['xsmall', 'small', 'medium', 'large', 'xlarge'] },
    icon: { control: false },
    menu: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ minBlockSize: 280, minInlineSize: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'More save options' }));
    const item = await within(document.body).findByRole('menuitem', { name: 'Save as…' });
    // It fades in, which needs painted frames: allow for a busy machine running many pages.
    await waitFor(() => expect(item).toBeVisible(), { timeout: 5000 });
  },
};

export const Variants: Story = {
  render: (args) => (
    <div className="sb-row">
      {VARIANTS.map((variant) => (
        <SplitButton key={variant} {...args} variant={variant}>
          {variant}
        </SplitButton>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  args: { icon: <EditIcon />, children: 'Edit' },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="sb-column">
      {(['xsmall', 'small', 'medium', 'large', 'xlarge'] as const).map((size) => (
        <SplitButton key={size} {...args} size={size} variant="tonal">
          {size}
        </SplitButton>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
};
