import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { EditIcon, ShareIcon, StarIcon } from '../stories/icons.js';
import { Select, SelectOption } from './select.js';

const meta = {
  title: 'Components/Select',
  component: Select,
  args: { label: 'Fruit', children: null },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'outlined'] },
    value: { control: false },
    defaultValue: { control: false },
    leadingIcon: { control: false },
    children: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 280, minBlockSize: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const YEARS = Array.from({ length: 60 }, (_, index) => 2026 - index);

const fruit = (
  <>
    <SelectOption value="apple">Apple</SelectOption>
    <SelectOption value="apricot">Apricot</SelectOption>
    <SelectOption value="banana">Banana</SelectOption>
    <SelectOption value="cherry">Cherry</SelectOption>
    <SelectOption value="grape" disabled>
      Grape (out of season)
    </SelectOption>
    <SelectOption value="pear">Pear</SelectOption>
  </>
);

export const Filled: Story = { args: { children: fruit } };

export const Outlined: Story = {
  args: { variant: 'outlined', defaultValue: 'banana', children: fruit },
};

/** Typing a letter jumps to the option that starts with it; the same letter again goes on to the next. */
export const WithSupportingText: Story = {
  args: { supportingText: 'Choose one', defaultValue: 'cherry', children: fruit },
};

export const WithError: Story = {
  args: { error: true, errorText: 'Pick a fruit to continue', children: fruit },
};

export const Disabled: Story = { args: { disabled: true, defaultValue: 'apple', children: fruit } };

export const LeadingIcons: Story = {
  args: {
    label: 'Action',
    leadingIcon: <EditIcon />,
    defaultValue: 'edit',
    children: (
      <>
        <SelectOption value="edit" leading={<EditIcon />}>
          Edit
        </SelectOption>
        <SelectOption value="share" leading={<ShareIcon />}>
          Share
        </SelectOption>
        <SelectOption value="star" leading={<StarIcon />}>
          Favourite
        </SelectOption>
      </>
    ),
  },
};

/** A long list scrolls inside its popup, and the arrow keys keep the active option in view. */
export const LongList: Story = {
  args: {
    label: 'Year',
    children: YEARS.map((year) => (
      <SelectOption key={year} value={String(year)}>
        {year}
      </SelectOption>
    )),
  },
};

export const Controlled: Story = {
  args: { children: fruit },
  render: (args) => {
    const [value, setValue] = useState<string | null>('pear');
    return (
      <>
        <Select {...args} value={value} onValueChange={setValue} />
        <p>Chosen: {value ?? 'nothing'}</p>
      </>
    );
  },
};

/** Opening the list and choosing an option: run by the tests, hidden from the sidebar. */
export const ChooseInteraction: Story = {
  ...Filled,
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('combobox', { name: 'Fruit' });
    await userEvent.click(field);
    const option = await within(document.body).findByRole('option', { name: 'Banana' });
    await waitFor(() => expect(option).toBeVisible(), { timeout: 5000 });
    await userEvent.click(option);
    await waitFor(() => expect(field).toHaveValue('Banana'), { timeout: 5000 });
  },
};
