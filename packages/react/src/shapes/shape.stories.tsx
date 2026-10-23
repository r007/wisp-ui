import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../button/button.js';
import { Select, SelectOption } from '../select/select.js';
import { Slider } from '../slider/slider.js';
import { type ShapeName, shapeNames, shapes } from './catalog.js';
import { cubicsToPath } from './cubic.js';
import { Morph } from './morph.js';
import { RoundedPolygon } from './rounded-polygon.js';
import { Shape } from './shape.js';

const meta = {
  title: 'Components/Shape',
  component: Shape,
  args: { shape: shapes.heart, size: 96 },
  argTypes: {
    shape: { control: false },
    size: { control: { type: 'number', min: 16, max: 240, step: 8 } },
    ref: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ color: 'var(--md-sys-color-primary)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Shape>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every shape in the catalogue. They are all made the same way, so any can morph into any other. */
export const Gallery: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <ul
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
        gap: 24,
        margin: 0,
        padding: 0,
        listStyle: 'none',
      }}
    >
      {shapeNames.map((name) => (
        <li
          key={name}
          style={{ display: 'grid', justifyItems: 'center', gap: 8, color: 'inherit' }}
        >
          <Shape {...args} shape={shapes[name]} size={72} />
          <code style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: 12 }}>
            {name}
          </code>
        </li>
      ))}
    </ul>
  ),
};

/** Changing `shape` morphs the old outline into the new one, as a spring. */
export const Playground: Story = {
  render: function Render(args) {
    const [name, setName] = useState<ShapeName>('heart');
    const next = () =>
      setName((n) => shapeNames[(shapeNames.indexOf(n) + 1) % shapeNames.length] as ShapeName);
    return (
      <div className="sb-column" style={{ alignItems: 'center' }}>
        <Shape {...args} shape={shapes[name]} aria-label={name} />
        <Button variant="tonal" onClick={next}>
          Next shape ({name})
        </Button>
      </div>
    );
  },
};

/** With `animated` off the outline changes at once; reduced motion does the same. */
export const NotAnimated: Story = {
  args: { animated: false },
  render: Playground.render,
};

/**
 * A morph is made once, then asked for its outline at any progress: here from the slider. Below 0
 * and above 1 it overshoots, which is what a spring does.
 */
export const MorphProgress: Story = {
  parameters: { layout: 'padded' },
  render: function Render() {
    const [from, setFrom] = useState<ShapeName>('cookie9Sided');
    const [to, setTo] = useState<ShapeName>('heart');
    const [progress, setProgress] = useState(0.5);
    const morph = new Morph(shapes[from], shapes[to]);
    return (
      <div className="sb-column" style={{ inlineSize: 'min(100%, 420px)', margin: '0 auto' }}>
        <svg
          viewBox="-0.25 -0.25 1.5 1.5"
          role="img"
          aria-label={`${from} morphed ${Math.round(progress * 100)}% towards ${to}`}
          style={{ inlineSize: '100%', blockSize: 'auto', fill: 'currentColor' }}
        >
          <path d={morph.toSvgPath(progress)} />
        </svg>
        <div className="sb-row" style={{ inlineSize: '100%' }}>
          <Select
            label="From"
            variant="outlined"
            value={from}
            onValueChange={(v) => setFrom(v as ShapeName)}
          >
            {shapeNames.map((name) => (
              <SelectOption key={name} value={name}>
                {name}
              </SelectOption>
            ))}
          </Select>
          <Select
            label="To"
            variant="outlined"
            value={to}
            onValueChange={(v) => setTo(v as ShapeName)}
          >
            {shapeNames.map((name) => (
              <SelectOption key={name} value={name}>
                {name}
              </SelectOption>
            ))}
          </Select>
        </div>
        <Slider
          aria-label="Morph progress"
          min={-0.25}
          max={1.25}
          step={0.01}
          value={progress}
          onValueChange={setProgress}
          formatValue={(v) => v.toFixed(2)}
          style={{ inlineSize: '100%' }}
        />
      </div>
    );
  },
};

/** Build your own: a star with rounded points and softer valleys, and a pill with a bulge. */
export const CustomShapes: Story = {
  render: (args) => {
    const star = RoundedPolygon.star(6, {
      innerRadius: 0.62,
      rounding: { radius: 0.18, smoothing: 0.4 },
      innerRounding: { radius: 0.1 },
    }).normalized();
    const pillStar = RoundedPolygon.pillStar({
      width: 2,
      height: 1,
      numVerticesPerRadius: 9,
      innerRadiusRatio: 0.7,
      rounding: { radius: 0.2, smoothing: 0.5 },
    }).normalized();
    return (
      <div className="sb-row">
        <Shape {...args} shape={star} aria-label="Rounded star" />
        <Shape {...args} shape={pillStar} aria-label="Pill star" />
      </div>
    );
  },
};

/** Whatever you draw, `cubicsToPath` gives you the path to put in your own `<svg>`. */
export const PathData: Story = {
  render: () => (
    <code style={{ overflowWrap: 'anywhere' }}>{cubicsToPath(shapes.circle.cubics, 2)}</code>
  ),
};
