import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '../button/button.js';
import { HelpIcon, LockIcon, NotificationsIcon, PersonIcon } from '../stories/icons.js';
import { Accordion, AccordionItem } from './accordion.js';

const meta = {
  title: 'Components/Accordion',
  component: Accordion,
  args: { children: null },
  argTypes: {
    variant: { control: 'inline-radio', options: ['segmented', 'flat'] },
    value: { control: false },
    defaultValue: { control: false },
    children: { control: false },
    ref: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 'min(100vw - 32px, 520px)' }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const faq = (
  <>
    <AccordionItem value="shipping" title="How long does shipping take?">
      Orders leave the warehouse within two working days. Most arrive in three to five.
    </AccordionItem>
    <AccordionItem value="returns" title="Can I return something?">
      Yes, within 30 days, in its original packaging. Returns are free.
    </AccordionItem>
    <AccordionItem value="warranty" title="Is there a warranty?">
      Everything we sell has a two-year warranty against faults.
    </AccordionItem>
  </>
);

/** Opening an item closes the one that was open, unless `multiple` is set. */
export const Segmented: Story = { args: { defaultValue: ['shipping'], children: faq } };

export const Flat: Story = { args: { variant: 'flat', defaultValue: ['returns'], children: faq } };

export const Multiple: Story = {
  args: { multiple: true, defaultValue: ['shipping', 'warranty'], children: faq },
};

export const WithIconsAndSupportingText: Story = {
  args: {
    defaultValue: ['account'],
    children: (
      <>
        <AccordionItem
          value="account"
          leading={<PersonIcon />}
          title="Account"
          supportingText="Name, email and password"
        >
          Change how you sign in, and who we say you are.
        </AccordionItem>
        <AccordionItem
          value="notifications"
          leading={<NotificationsIcon />}
          title="Notifications"
          supportingText="Email and push"
        >
          Choose what is worth interrupting you for.
        </AccordionItem>
        <AccordionItem
          value="privacy"
          leading={<LockIcon />}
          title="Privacy"
          supportingText="Who sees what"
        >
          Your profile is visible to people you share a team with.
        </AccordionItem>
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    children: (
      <>
        <AccordionItem value="a" title="Available">
          This one opens.
        </AccordionItem>
        <AccordionItem value="b" title="Not available" disabled>
          This one does not.
        </AccordionItem>
        <AccordionItem value="c" title="Also available">
          So does this.
        </AccordionItem>
      </>
    ),
  },
};

/** An item's content can be anything, including controls: they are not reachable until it opens. */
export const WithContent: Story = {
  args: {
    defaultValue: ['help'],
    children: (
      <>
        <AccordionItem value="help" leading={<HelpIcon />} title="Need a hand?">
          <p style={{ margin: '0 0 12px' }}>Our team replies within a day.</p>
          <Button variant="tonal">Contact support</Button>
        </AccordionItem>
        <AccordionItem value="status" title="Service status">
          All systems normal.
        </AccordionItem>
      </>
    ),
  },
};

/** Controlled: the open items are the `value`, and it can be set from anywhere. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['returns']);
    return (
      <div className="sb-column" style={{ inlineSize: '100%' }}>
        <Accordion {...args} multiple value={value} onValueChange={setValue}>
          {faq}
        </Accordion>
        <div className="sb-row">
          <Button variant="outlined" onClick={() => setValue(['shipping', 'returns', 'warranty'])}>
            Open all
          </Button>
          <Button variant="outlined" onClick={() => setValue([])}>
            Close all
          </Button>
        </div>
      </div>
    );
  },
};

export const SegmentedInteraction: Story = {
  tags: ['!dev', '!autodocs'],
  args: { children: faq },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByRole('button', { name: 'How long does shipping take?' });
    await userEvent.click(header);
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Can I return something?' }));
    await expect(header).toHaveAttribute('aria-expanded', 'false');
  },
};
