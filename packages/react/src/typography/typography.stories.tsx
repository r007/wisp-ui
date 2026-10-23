import type { Meta, StoryObj } from '@storybook/react-vite';
import { TYPOGRAPHY_VARIANTS, Typography } from './typography.js';

const meta = {
  title: 'Components/Typography',
  component: Typography,
  args: { children: 'The quick brown fox jumps over the lazy dog', variant: 'body-large' },
  argTypes: {
    variant: { control: 'select', options: TYPOGRAPHY_VARIANTS },
    render: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The whole scale, each style plain and emphasised. */
export const Scale: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {TYPOGRAPHY_VARIANTS.map((variant) => (
        <div
          key={variant}
          style={{
            display: 'grid',
            gridTemplateColumns: '11rem 1fr 1fr',
            gap: 24,
            alignItems: 'baseline',
          }}
        >
          <Typography
            variant="label-medium"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {variant}
          </Typography>
          <Typography variant={variant}>Sphinx of black quartz</Typography>
          <Typography variant={variant} emphasized>
            Sphinx of black quartz
          </Typography>
        </div>
      ))}
    </div>
  ),
};

/** A style says how text looks, not what it is: `render` makes it a heading. */
export const AsHeadings: Story = {
  render: () => (
    <>
      {/* biome-ignore lint/a11y/useHeadingContent: the content is Typography's children. */}
      <Typography variant="display-small" render={<h1 />}>
        A page title
      </Typography>
      {/* biome-ignore lint/a11y/useHeadingContent: the content is Typography's children. */}
      <Typography variant="title-large" render={<h2 />}>
        A section
      </Typography>
      <Typography variant="body-large">
        Body text under it, a paragraph in the type scale's body style.
      </Typography>
    </>
  ),
};
