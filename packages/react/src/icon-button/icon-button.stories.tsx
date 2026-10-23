import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
  FavoriteFilledIcon,
  FavoriteIcon,
  MoreVertIcon,
  SettingsIcon,
  ShareIcon,
} from '../stories/icons.js';
import {
  IconButton,
  type IconButtonShape,
  type IconButtonSize,
  type IconButtonVariant,
  type IconButtonWidth,
} from './icon-button.js';

const VARIANTS: IconButtonVariant[] = ['standard', 'filled', 'tonal', 'outlined'];
const SIZES: IconButtonSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
const WIDTHS: IconButtonWidth[] = ['narrow', 'default', 'wide'];
const SHAPES: IconButtonShape[] = ['round', 'square'];

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  args: { 'aria-label': 'Settings', children: <SettingsIcon />, onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: SIZES },
    width: { control: 'inline-radio', options: WIDTHS },
    shape: { control: 'inline-radio', options: SHAPES },
    children: { control: false },
    selectedIcon: { control: false },
    render: { control: false },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="sb-row">
      {VARIANTS.map((variant) => (
        <IconButton key={variant} {...args} variant={variant} aria-label={variant} />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="sb-row">
      {SIZES.map((size) => (
        <IconButton key={size} {...args} variant="filled" size={size} aria-label={size} />
      ))}
    </div>
  ),
};

export const Widths: Story = {
  render: (args) => (
    <div className="sb-row">
      {WIDTHS.map((width) => (
        <IconButton key={width} {...args} variant="tonal" width={width} aria-label={width} />
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: (args) => (
    <div className="sb-row">
      {SHAPES.map((shape) => (
        <IconButton key={shape} {...args} variant="filled" shape={shape} aria-label={shape} />
      ))}
    </div>
  ),
};

/** A toggle swaps to `selectedIcon` and morphs between round and square corners. */
export const Toggle: Story = {
  args: {
    'aria-label': 'Favourite',
    variant: 'tonal',
    defaultSelected: false,
    onSelectedChange: fn(),
    children: <FavoriteIcon />,
    selectedIcon: <FavoriteFilledIcon />,
  },
};

/** The `Toggle` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const ToggleInteraction: Story = {
  ...Toggle,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Favourite' });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(args.onSelectedChange).toHaveBeenCalledWith(true);
  },
};

export const ToggleAllVariants: Story = {
  render: (args) => (
    <div className="sb-column">
      {VARIANTS.map((variant) => (
        <div key={variant} className="sb-row">
          <IconButton
            {...args}
            variant={variant}
            aria-label={`${variant} off`}
            defaultSelected={false}
            selectedIcon={<FavoriteFilledIcon />}
          >
            <FavoriteIcon />
          </IconButton>
          <IconButton
            {...args}
            variant={variant}
            aria-label={`${variant} on`}
            defaultSelected
            selectedIcon={<FavoriteFilledIcon />}
          >
            <FavoriteIcon />
          </IconButton>
        </div>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="sb-row">
      {VARIANTS.map((variant) => (
        <IconButton key={variant} {...args} variant={variant} aria-label={variant} disabled />
      ))}
    </div>
  ),
};

export const AsLink: Story = {
  args: {
    href: 'https://github.com/r007/wisp-ui',
    'aria-label': 'Share',
    children: <ShareIcon />,
    variant: 'outlined',
  },
};

export const InAToolbar: Story = {
  render: (args) => (
    <div className="sb-row">
      <IconButton {...args} aria-label="Share">
        <ShareIcon />
      </IconButton>
      <IconButton {...args} aria-label="Favourite">
        <FavoriteIcon />
      </IconButton>
      <IconButton {...args} aria-label="More options">
        <MoreVertIcon />
      </IconButton>
    </div>
  ),
};
