import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Card, type CardVariant } from './card.js';

const VARIANTS: CardVariant[] = ['elevated', 'filled', 'outlined'];

const meta = {
  title: 'Components/Card',
  component: Card,
  args: { children: 'Card content' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    render: { control: false },
    ref: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const Body = ({ title = 'Blue train' }: { title?: string }) => (
  <div style={{ padding: 16 }}>
    <h3 style={{ margin: 0, font: 'var(--md-sys-typescale-title-medium)' }}>{title}</h3>
    <p
      style={{
        margin: '4px 0 0',
        font: 'var(--md-sys-typescale-body-medium)',
        color: 'var(--md-sys-color-on-surface-variant)',
      }}
    >
      John Coltrane, 1958
    </p>
  </div>
);

export const Playground: Story = {
  render: (args) => (
    <Card {...args}>
      <Body />
    </Card>
  ),
};

export const Variants: Story = {
  render: (args) => (
    <div className="sb-column" style={{ inlineSize: 320 }}>
      {VARIANTS.map((variant) => (
        <Card key={variant} {...args} variant={variant} style={{ inlineSize: '100%' }}>
          <Body title={variant} />
        </Card>
      ))}
    </div>
  ),
};

/** With `href` the whole card is one link and may contain headings and paragraphs. */
export const AsLink: Story = {
  render: (args) => (
    <div className="sb-column" style={{ inlineSize: 320 }}>
      {VARIANTS.map((variant) => (
        <Card
          key={variant}
          {...args}
          variant={variant}
          href="#album"
          style={{ inlineSize: '100%' }}
        >
          <Body title={`${variant} link`} />
        </Card>
      ))}
    </div>
  ),
};

/** With `onClick` the card is a button: keep its content to phrasing elements. */
export const AsButton: Story = {
  args: { onClick: fn() },
  render: (args) => (
    <div className="sb-column" style={{ inlineSize: 320 }}>
      {VARIANTS.map((variant) => (
        <Card key={variant} {...args} variant={variant}>
          <span style={{ display: 'block', padding: 16 }}>{variant} button</span>
        </Card>
      ))}
    </div>
  ),
};

/** The `AsButton` story's interaction, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const AsButtonInteraction: Story = {
  ...AsButton,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'elevated button' }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const DraggedAndDisabled: Story = {
  render: (args) => (
    <div className="sb-column" style={{ inlineSize: 320 }}>
      {VARIANTS.map((variant) => (
        <div key={variant} className="sb-column" style={{ inlineSize: '100%' }}>
          <Card {...args} variant={variant} dragged style={{ inlineSize: '100%' }}>
            <Body title={`${variant} dragged`} />
          </Card>
          <Card
            {...args}
            variant={variant}
            onClick={() => {}}
            disabled
            style={{ inlineSize: '100%' }}
          >
            <span style={{ display: 'block', padding: 16 }}>{variant} disabled</span>
          </Card>
        </div>
      ))}
    </div>
  ),
};
