import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Carousel, CarouselItem } from './carousel.js';

const SLIDES = [
  { name: 'Apple pie', hue: 24 },
  { name: 'Banana bread', hue: 48 },
  { name: 'Carrot cake', hue: 12 },
  { name: 'Chicken soup', hue: 36 },
  { name: 'Lemon tart', hue: 60 },
  { name: 'Mushroom risotto', hue: 30 },
  { name: 'Pancakes', hue: 42 },
  { name: 'Ratatouille', hue: 0 },
];

/** A stand-in for a photo: a flat colour, with the name at the bottom. */
const Slide = ({ name, hue }: { name: string; hue: number }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      inlineSize: '100%',
      blockSize: '100%',
      boxSizing: 'border-box',
      padding: 16,
      background: `oklch(0.78 0.09 ${hue})`,
      color: `oklch(0.25 0.05 ${hue})`,
      font: 'var(--md-sys-typescale-title-medium)',
      whiteSpace: 'nowrap',
    }}
  >
    {name}
  </div>
);

const meta = {
  title: 'Components/Carousel',
  component: Carousel,
  args: { 'aria-label': 'Recipes', height: 220 },
  argTypes: {
    layout: {
      control: 'inline-radio',
      options: ['multi-browse', 'hero', 'center-hero', 'uncontained'],
    },
    children: { control: false },
    weights: { control: false },
    ref: { control: false },
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: 640, margin: '0 auto', padding: 24 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = SLIDES.map((slide) => (
  <CarouselItem key={slide.name} aria-label={slide.name} href="#recipe">
    <Slide {...slide} />
  </CarouselItem>
));

export const Playground: Story = { args: { children: items } };

/** One large item, a medium and a small, for browsing many. */
export const MultiBrowse: Story = { args: { layout: 'multi-browse', children: items } };

/** One large item and a sliver of the next. */
export const Hero: Story = { args: { layout: 'hero', children: items } };

/** A large item in the middle and a sliver each side. */
export const CenterHero: Story = { args: { layout: 'center-hero', children: items } };

/** Items of one size, scrolled freely. */
export const Uncontained: Story = {
  args: { layout: 'uncontained', itemWidth: 186, children: items },
};

/** Weights are the relative widths of the slots, first to last. */
export const CustomWeights: Story = {
  args: { weights: [2, 5, 2, 1], children: items },
};

export const WithActions: Story = {
  args: { children: null },
  render: (args) => {
    const [last, setLast] = useState('Nothing yet');
    return (
      <>
        <Carousel {...args}>
          {SLIDES.map((slide) => (
            <CarouselItem
              key={slide.name}
              aria-label={slide.name}
              onClick={() => setLast(slide.name)}
            >
              <Slide {...slide} />
            </CarouselItem>
          ))}
        </Carousel>
        <p>Chose: {last}</p>
      </>
    );
  },
};
