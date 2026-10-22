import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../button/button.js';
import { ButtonGroup, type ButtonGroupSize } from './button-group.js';

const SIZES: ButtonGroupSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];

const meta = {
  title: 'Components/ButtonGroup',
  component: ButtonGroup,
  args: { 'aria-label': 'Actions' },
  argTypes: {
    size: { control: 'inline-radio', options: SIZES },
    ref: { control: false },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="tonal">Save</Button>
      <Button variant="tonal">Share</Button>
      <Button variant="tonal">Delete</Button>
    </ButtonGroup>
  ),
};

/** Buttons 2px apart that share their corners: round at the ends, small where they touch. */
export const Connected: Story = {
  render: (args) => (
    <ButtonGroup {...args} connected>
      <Button variant="outlined">Day</Button>
      <Button variant="outlined">Week</Button>
      <Button variant="outlined">Month</Button>
    </ButtonGroup>
  ),
};

/** Toggle buttons in a connected group round fully while they are selected. */
export const ConnectedToggles: Story = {
  render: (args) => {
    const [view, setView] = useState('week');
    return (
      <ButtonGroup {...args} connected aria-label="View">
        {['day', 'week', 'month'].map((name) => (
          <Button
            key={name}
            variant="outlined"
            selected={view === name}
            onSelectedChange={() => setView(name)}
          >
            {name}
          </Button>
        ))}
      </ButtonGroup>
    );
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="sb-column">
      {SIZES.map((size) => (
        <div key={size} className="sb-row" style={{ gap: 32 }}>
          <ButtonGroup {...args} size={size}>
            <Button variant="filled">{size}</Button>
            <Button variant="filled">Group</Button>
          </ButtonGroup>
          <ButtonGroup {...args} size={size} connected>
            <Button variant="tonal">{size}</Button>
            <Button variant="tonal">Connected</Button>
          </ButtonGroup>
        </div>
      ))}
    </div>
  ),
};
