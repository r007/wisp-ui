import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { AddIcon, EditIcon } from '../stories/icons.js';
import { Fab, type FabSize, type FabVariant } from './fab.js';

const VARIANTS: FabVariant[] = [
  'primary-container',
  'secondary-container',
  'tertiary-container',
  'primary',
  'secondary',
  'tertiary',
  'surface',
];
const SIZES: FabSize[] = ['small', 'default', 'medium', 'large'];

const meta = {
  title: 'Components/Fab',
  component: Fab,
  args: { 'aria-label': 'Add', icon: <AddIcon />, onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'inline-radio', options: SIZES },
    icon: { control: false },
    render: { control: false },
    ref: { control: false },
  },
} satisfies Meta<typeof Fab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="sb-row">
      {VARIANTS.map((variant) => (
        <Fab key={variant} {...args} variant={variant} aria-label={variant} />
      ))}
      <Fab {...args} variant="surface" lowered aria-label="surface lowered" />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="sb-row">
      {SIZES.map((size) => (
        <Fab key={size} {...args} size={size} aria-label={size} />
      ))}
    </div>
  ),
};

/** With a label the FAB is extended. There is no small size: it uses the default. */
export const Extended: Story = {
  render: (args) => (
    <div className="sb-column">
      <div className="sb-row">
        {VARIANTS.slice(0, 4).map((variant) => (
          <Fab key={variant} {...args} variant={variant} icon={<EditIcon />} aria-label={undefined}>
            Compose
          </Fab>
        ))}
      </div>
      <div className="sb-row">
        <Fab {...args} icon={<EditIcon />} aria-label={undefined} size="medium">
          Medium
        </Fab>
        <Fab {...args} icon={<EditIcon />} aria-label={undefined} size="large">
          Large
        </Fab>
      </div>
    </div>
  ),
};

/** An extended FAB folds to its icon as a page scrolls. Keep `aria-label` for when it does. */
export const Collapsible: Story = {
  render: (args) => {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div className="sb-column">
        <Fab {...args} icon={<EditIcon />} aria-label="Compose" collapsed={collapsed}>
          Compose
        </Fab>
        <Button variant="text" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? 'Expand' : 'Collapse'}
        </Button>
      </div>
    );
  },
};

/** The `Collapsible` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const CollapsibleInteraction: Story = {
  ...Collapsible,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse' }));
    await expect(canvas.getByRole('button', { name: 'Compose' })).toHaveAttribute('data-collapsed');
  },
};

export const AsLink: Story = {
  args: { href: '#new', onClick: undefined },
};
