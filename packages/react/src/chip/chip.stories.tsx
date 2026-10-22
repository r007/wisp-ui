import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ArrowDropDownIcon, EventIcon, StarIcon } from '../stories/icons.js';
import { Chip, type ChipVariant } from './chip.js';
import { ChipGroup } from './chip-group.js';

const VARIANTS: ChipVariant[] = ['assist', 'filter', 'input', 'suggestion'];

const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: { children: 'Label', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    icon: { control: false },
    avatar: { control: false },
    trailingIcon: { control: false },
    render: { control: false },
    ref: { control: false },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <ChipGroup aria-label="Variants">
      <Chip {...args} variant="assist" icon={<EventIcon />}>
        Assist
      </Chip>
      <Chip {...args} variant="filter" defaultSelected>
        Filter
      </Chip>
      <Chip {...args} variant="input" onRemove={fn()}>
        Input
      </Chip>
      <Chip {...args} variant="suggestion">
        Suggestion
      </Chip>
    </ChipGroup>
  ),
};

export const Elevated: Story = {
  render: (args) => (
    <ChipGroup aria-label="Elevated">
      <Chip {...args} elevated icon={<EventIcon />}>
        Assist
      </Chip>
      <Chip {...args} elevated variant="filter">
        Filter
      </Chip>
      <Chip {...args} elevated variant="filter" defaultSelected>
        Selected
      </Chip>
      <Chip {...args} elevated variant="suggestion">
        Suggestion
      </Chip>
    </ChipGroup>
  ),
};

export const Icons: Story = {
  render: (args) => (
    <ChipGroup aria-label="With icons">
      <Chip {...args} icon={<StarIcon />}>
        Leading icon
      </Chip>
      <Chip {...args} variant="filter" icon={<StarIcon />}>
        Filter icon
      </Chip>
      <Chip {...args} variant="filter" trailingIcon={<ArrowDropDownIcon />}>
        Drop-down
      </Chip>
      <Chip
        {...args}
        variant="input"
        avatar={
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect width="24" height="24" fill="currentColor" />
          </svg>
        }
        onRemove={fn()}
      >
        Avatar
      </Chip>
    </ChipGroup>
  ),
};

/** Filter chips are toggles; a group names what they filter. */
export const Filters: Story = {
  render: (args) => {
    const [genres, setGenres] = useState<string[]>(['Jazz']);
    return (
      <ChipGroup aria-label="Genre">
        {['Jazz', 'Blues', 'Soul', 'Funk'].map((genre) => (
          <Chip
            key={genre}
            {...args}
            variant="filter"
            selected={genres.includes(genre)}
            onSelectedChange={(on) =>
              setGenres(on ? [...genres, genre] : genres.filter((g) => g !== genre))
            }
          >
            {genre}
          </Chip>
        ))}
      </ChipGroup>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const blues = canvas.getByRole('button', { name: 'Blues' });
    await expect(blues).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(blues);
    await expect(blues).toHaveAttribute('aria-pressed', 'true');
  },
};

/** An input chip is removed with its button, or with Backspace/Delete while focused. */
export const Inputs: Story = {
  render: (args) => {
    const [tags, setTags] = useState(['Jazz', 'Blues', 'Soul']);
    return (
      <ChipGroup aria-label="Tags">
        {tags.map((tag) => (
          <Chip
            key={tag}
            {...args}
            variant="input"
            onRemove={() => setTags(tags.filter((t) => t !== tag))}
          >
            {tag}
          </Chip>
        ))}
      </ChipGroup>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Blues' }));
    await expect(canvas.queryByRole('button', { name: 'Blues' })).toBeNull();
  },
};

export const Disabled: Story = {
  render: (args) => (
    <ChipGroup aria-label="Disabled">
      <Chip {...args} disabled icon={<EventIcon />}>
        Assist
      </Chip>
      <Chip {...args} disabled variant="filter" defaultSelected>
        Selected
      </Chip>
      <Chip {...args} disabled variant="filter">
        Filter
      </Chip>
      <Chip {...args} disabled elevated variant="suggestion">
        Elevated
      </Chip>
      <Chip {...args} disabled variant="input" onRemove={fn()}>
        Input
      </Chip>
    </ChipGroup>
  ),
};

export const AsLink: Story = {
  args: { href: '#maps', onClick: undefined },
  render: (args) => (
    <Chip {...args} icon={<EventIcon />}>
      Open in Maps
    </Chip>
  ),
};
