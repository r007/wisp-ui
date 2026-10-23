import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AddIcon, SendIcon, StarFilledIcon, StarIcon } from '../stories/icons.js';
import { Button, type ButtonShape, type ButtonSize, type ButtonVariant } from './button.js';

const VARIANTS: ButtonVariant[] = ['elevated', 'filled', 'tonal', 'outlined', 'text'];
const SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
const SHAPES: ButtonShape[] = ['round', 'square'];

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Label', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: SIZES },
    shape: { control: 'inline-radio', options: SHAPES },
    icon: { control: false },
    trailingIcon: { control: false },
    render: { control: false },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="sb-row">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="sb-row">
      {SIZES.map((size) => (
        <Button key={size} {...args} size={size} icon={<AddIcon />}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: (args) => (
    <div className="sb-row">
      {SHAPES.map((shape) => (
        <Button key={shape} {...args} shape={shape}>
          {shape}
        </Button>
      ))}
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div className="sb-row">
      <Button {...args} icon={<SendIcon />}>
        Send
      </Button>
      <Button {...args} variant="tonal" trailingIcon={<AddIcon />}>
        Add
      </Button>
    </div>
  ),
};

/** A toggle morphs between round and square corners as it is selected. */
export const Toggle: Story = {
  args: { variant: 'tonal', defaultSelected: false, onSelectedChange: fn() },
  render: (args) => (
    <div className="sb-row">
      {SHAPES.map((shape) => (
        <Button key={shape} {...args} shape={shape} icon={<StarIcon />} trailingIcon={undefined}>
          Favourite
        </Button>
      ))}
    </div>
  ),
};

/** The `Toggle` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const ToggleInteraction: Story = {
  ...Toggle,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement, args }) => {
    const [button] = within(canvasElement).getAllByRole('button');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button as HTMLElement);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(args.onSelectedChange).toHaveBeenCalledWith(true);
  },
};

export const ToggleAllVariants: Story = {
  render: (args) => (
    <div className="sb-column">
      {(['elevated', 'filled', 'tonal', 'outlined'] as const).map((variant) => (
        <div key={variant} className="sb-row">
          <Button {...args} variant={variant} defaultSelected={false} icon={<StarIcon />}>
            Unselected
          </Button>
          <Button {...args} variant={variant} defaultSelected icon={<StarFilledIcon />}>
            Selected
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="sb-row">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant} disabled>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

/** With `href` the button renders an anchor. Use `render` to use a router's link instead. */
export const AsLink: Story = {
  args: { href: 'https://m3.material.io', variant: 'outlined' },
  render: (args) => <Button {...args}>Material Design</Button>,
};
