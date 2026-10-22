import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { IconButton } from '../icon-button/icon-button.js';
import {
  CloseIcon,
  PersonIcon,
  SearchIcon,
  VisibilityIcon,
  VisibilityOffIcon,
} from '../stories/icons.js';
import { TextField, type TextFieldVariant } from './text-field.js';

const VARIANTS: TextFieldVariant[] = ['filled', 'outlined'];

/** Fields fill their container, so the stories stack them in one that stretches its children. */
const Stack = ({ children, gap = 16 }: { children: ReactNode; gap?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap, inlineSize: 280 }}>{children}</div>
);

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: 'Label' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    leadingIcon: { control: false },
    trailingIcon: { control: false },
    ref: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Both variants in the states a user meets: empty, filled, invalid and disabled. */
export const States: Story = {
  render: (args) => (
    <Stack gap={24}>
      {VARIANTS.map((variant) => (
        <Stack key={variant}>
          <TextField {...args} variant={variant} label="Empty" supportingText="Supporting text" />
          <TextField {...args} variant={variant} label="Filled" defaultValue="Ada Lovelace" />
          <TextField
            {...args}
            variant={variant}
            label="Invalid"
            defaultValue="ada@"
            error
            errorText="Enter a valid email"
          />
          <TextField {...args} variant={variant} label="Disabled" defaultValue="Locked" disabled />
        </Stack>
      ))}
    </Stack>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <Stack>
      <TextField {...args} label="Name" leadingIcon={<PersonIcon />} />
      <TextField
        {...args}
        variant="outlined"
        label="Search"
        leadingIcon={<SearchIcon />}
        trailingIcon={
          <IconButton aria-label="Clear" size="xsmall">
            <CloseIcon />
          </IconButton>
        }
      />
    </Stack>
  ),
};

export const PrefixAndSuffix: Story = {
  render: (args) => (
    <Stack>
      <TextField {...args} label="Amount" prefixText="$" suffixText="USD" inputMode="decimal" />
      <TextField {...args} variant="outlined" label="Weight" suffixText="kg" inputMode="decimal" />
    </Stack>
  ),
};

export const Multiline: Story = {
  render: (args) => (
    <Stack>
      <TextField {...args} label="Bio" multiline rows={3} counter maxLength={120} />
      <TextField {...args} variant="outlined" label="Notes" multiline rows={3} />
    </Stack>
  ),
};

/** A trailing control is a real button: it takes its own focus and clicks. */
export const PasswordToggle: Story = {
  render: (args) => {
    const [visible, setVisible] = useState(false);
    return (
      <TextField
        {...args}
        variant="outlined"
        label="Password"
        type={visible ? 'text' : 'password'}
        defaultValue="hunter2"
        trailingIcon={
          <IconButton
            aria-label={visible ? 'Hide password' : 'Show password'}
            size="xsmall"
            onClick={() => setVisible(!visible)}
          >
            {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        }
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Show password' }));
    await expect(canvas.getByLabelText('Password')).toHaveAttribute('type', 'text');
  },
};

/** Validation is the browser's: `required` and `type` drive the invalid state here. */
export const Validation: Story = {
  render: (args) => {
    const [value, setValue] = useState('');
    const invalid = value.length > 0 && !value.includes('@');
    return (
      <TextField
        {...args}
        label="Email"
        type="email"
        required
        value={value}
        onValueChange={setValue}
        error={invalid}
        supportingText="Where we send the receipt"
        errorText="Include an @"
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('textbox', { name: /Email/ });
    await userEvent.type(field, 'ada');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
  },
};
