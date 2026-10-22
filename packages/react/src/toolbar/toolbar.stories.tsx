import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Fab } from '../fab/fab.js';
import { IconButton } from '../icon-button/icon-button.js';
import {
  AddIcon,
  FormatAlignCenterIcon,
  FormatAlignLeftIcon,
  FormatAlignRightIcon,
  FormatBoldIcon,
  FormatItalicIcon,
  FormatUnderlinedIcon,
  ShareIcon,
} from '../stories/icons.js';
import { Toolbar } from './toolbar.js';

const meta = {
  title: 'Components/Toolbar',
  component: Toolbar,
  args: { 'aria-label': 'Text formatting' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['docked', 'floating'] },
    scheme: { control: 'inline-radio', options: ['standard', 'vibrant'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    fab: { control: false },
    children: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each of these is a toggle; the toolbar gives the pressed ones their selected container. */
function Formatting() {
  const [on, setOn] = useState({ bold: true, italic: false, underline: false });
  const toggle = (key: keyof typeof on) => setOn((prev) => ({ ...prev, [key]: !prev[key] }));
  return (
    <>
      <IconButton aria-label="Bold" selected={on.bold} onSelectedChange={() => toggle('bold')}>
        <FormatBoldIcon />
      </IconButton>
      <IconButton
        aria-label="Italic"
        selected={on.italic}
        onSelectedChange={() => toggle('italic')}
      >
        <FormatItalicIcon />
      </IconButton>
      <IconButton
        aria-label="Underline"
        selected={on.underline}
        onSelectedChange={() => toggle('underline')}
      >
        <FormatUnderlinedIcon />
      </IconButton>
    </>
  );
}

const alignment = (
  <>
    <IconButton aria-label="Align left">
      <FormatAlignLeftIcon />
    </IconButton>
    <IconButton aria-label="Align centre">
      <FormatAlignCenterIcon />
    </IconButton>
    <IconButton aria-label="Align right">
      <FormatAlignRightIcon />
    </IconButton>
  </>
);

export const Playground: Story = {
  args: { variant: 'floating', children: <Formatting /> },
};

export const Docked: Story = {
  args: { variant: 'docked', children: <Formatting /> },
};

export const Vibrant: Story = {
  args: { variant: 'floating', scheme: 'vibrant', children: <Formatting /> },
};

export const WithFab: Story = {
  args: {
    variant: 'floating',
    children: (
      <>
        {alignment}
        <IconButton aria-label="Share">
          <ShareIcon />
        </IconButton>
      </>
    ),
    fab: <Fab aria-label="Add" variant="primary" icon={<AddIcon />} />,
  },
};

export const Vertical: Story = {
  args: { variant: 'floating', orientation: 'vertical', children: alignment },
};
