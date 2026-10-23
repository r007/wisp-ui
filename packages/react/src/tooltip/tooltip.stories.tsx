import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { IconButton } from '../icon-button/icon-button.js';
import { StarIcon } from '../stories/icons.js';
import { Tooltip } from './tooltip.js';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  args: { content: 'Add to favourites', delay: 100, children: <Button>Trigger</Button> },
  argTypes: {
    variant: { control: 'inline-radio', options: ['plain', 'rich'] },
    placement: { control: 'inline-radio', options: ['top', 'bottom', 'start', 'end'] },
    children: { control: false },
    actions: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '96px 160px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <IconButton aria-label="Favourite">
        <StarIcon />
      </IconButton>
    </Tooltip>
  ),
};

/** The `Plain` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const PlainInteraction: Story = {
  ...Plain,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Favourite' }));
    await expect(await within(document.body).findByRole('tooltip')).toBeVisible();
  },
};

/** An always-open tooltip, to see where each placement puts it. */
export const Placements: Story = {
  render: (args) => (
    <div className="sb-row" style={{ gap: 160 }}>
      {(['top', 'bottom', 'start', 'end'] as const).map((placement) => (
        <Tooltip key={placement} {...args} placement={placement} content={placement} open>
          <Button variant="outlined">{placement}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

/** A rich tooltip holds a sentence or two, and stays open while the pointer is on it. */
export const Rich: Story = {
  render: (args) => (
    <Tooltip
      {...args}
      variant="rich"
      subhead="Favourites"
      content="Saved items appear on your home screen, in the order you added them."
      actions={<Button variant="text">Learn more</Button>}
    >
      <Button variant="tonal">Favourite</Button>
    </Tooltip>
  ),
};
