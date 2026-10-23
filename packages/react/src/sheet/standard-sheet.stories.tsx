import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { StandardSheet } from './standard-sheet.js';

const meta = {
  title: 'Components/Standard sheet',
  component: StandardSheet,
  args: { open: true },
  argTypes: {
    side: { control: 'inline-radio', options: ['bottom', 'start', 'end'] },
    open: { control: 'boolean' },
    width: { control: { type: 'number', min: 256, max: 640 } },
    actions: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof StandardSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const filters = (
  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
    {['Price', 'Rating', 'Distance', 'Open now', 'Free delivery'].map((name) => (
      <li key={name}>
        <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="checkbox" /> {name}
        </label>
      </li>
    ))}
  </ul>
);

/** A page stands in for the app: the sheet takes its place in the layout, beside the content. */
const Page = ({
  direction,
  children,
}: {
  direction: 'row' | 'row-reverse' | 'column';
  children: React.ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: direction,
      blockSize: 480,
      background: 'var(--md-sys-color-surface)',
      color: 'var(--md-sys-color-on-surface)',
    }}
  >
    {children}
  </div>
);

const Content = ({ children }: { children: React.ReactNode }) => (
  <main style={{ flex: 1, minInlineSize: 0, minBlockSize: 0, padding: 24, overflow: 'auto' }}>
    {children}
  </main>
);

/** The sheet and the page share a screen: the page stays usable and gives the sheet room. */
export const Side: Story = {
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return (
      <Page direction="row">
        <Content>
          <Button onClick={() => setOpen((value) => !value)}>
            {open ? 'Close filters' : 'Open filters'}
          </Button>
          <p>
            A standard side sheet does not cover the page. It has no scrim and no focus trap, and
            the content beside it keeps working: nothing here is inert.
          </p>
        </Content>
        <StandardSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          side="end"
          headline="Filters"
          actions={
            <>
              <Button variant="text" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="filled" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </>
          }
        >
          {filters}
        </StandardSheet>
      </Page>
    );
  },
};

/** The sheet's side is the start edge instead, and flips in a right-to-left layout. */
export const SideStart: Story = {
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return (
      <Page direction="row">
        <StandardSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          side="start"
          headline="Filters"
          width={300}
        >
          {filters}
        </StandardSheet>
        <Content>
          <Button onClick={() => setOpen((value) => !value)}>
            {open ? 'Close filters' : 'Open filters'}
          </Button>
        </Content>
      </Page>
    );
  },
};

/** At the foot of a column: the handle closes it on a press or a drag down. */
export const Bottom: Story = {
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return (
      <Page direction="column">
        <Content>
          <Button onClick={() => setOpen((value) => !value)}>
            {open ? 'Close sheet' : 'Open sheet'}
          </Button>
          <p>The sheet is the last item in the column, so the content above gives it room.</p>
        </Content>
        <StandardSheet
          {...args}
          open={open}
          onOpenChange={setOpen}
          side="bottom"
          headline="Now playing"
        >
          <p style={{ margin: 0 }}>
            Drag the handle down, press it, or press Escape while focus is inside to close.
          </p>
        </StandardSheet>
      </Page>
    );
  },
};

export const Closed: Story = {
  args: { open: false },
  render: (args) => (
    <Page direction="row">
      <Content>A closed sheet takes no room and is inert.</Content>
      <StandardSheet {...args} headline="Filters">
        {filters}
      </StandardSheet>
    </Page>
  ),
};

/** Opening and closing, run by the tests but hidden from the sidebar, so the story stays as you left it. */
export const SideInteraction: Story = {
  ...Side,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sheet = canvas.getByRole('complementary', { name: 'Filters' });
    await waitFor(() => expect(sheet).toBeVisible(), { timeout: 5000 });
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(sheet).toHaveAttribute('inert'), { timeout: 5000 });
  },
};
