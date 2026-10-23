import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { shapes } from './catalog.js';
import { cubicsToPath } from './cubic.js';
import { MORPH_SPRING, springPosition, springSettleSeconds } from './motion.js';
import { Shape } from './shape.js';

const path = () => document.querySelector('svg path') as SVGPathElement;
const svg = () => document.querySelector('svg') as SVGSVGElement;
const d = () => path().getAttribute('d');
const outline = (name: keyof typeof shapes) => cubicsToPath(shapes[name].cubics);

const reducedMotion = () =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );

test('draws the outline of its shape in the unit square', async () => {
  await render(<Shape shape={shapes.heart} />);
  expect(d()).toBe(outline('heart'));
  expect(svg().getAttribute('viewBox')).toBe('0 0 1 1');
});

test('is decorative without a label, and an image with one', async () => {
  await render(<Shape shape={shapes.heart} />);
  expect(svg().getAttribute('aria-hidden')).toBe('true');
  expect(svg().hasAttribute('role')).toBe(false);
});

test('is a named image when it has an aria-label', async () => {
  await render(<Shape shape={shapes.heart} aria-label="Favourite" />);
  await expect.element(page.getByRole('img', { name: 'Favourite' })).toBeVisible();
  expect(svg().hasAttribute('aria-hidden')).toBe(false);
});

test('is 1em square by default, and a number is pixels', async () => {
  const { rerender } = await render(<Shape shape={shapes.heart} style={{ fontSize: '20px' }} />);
  expect(svg().getBoundingClientRect().width).toBe(20);
  expect(svg().getBoundingClientRect().height).toBe(20);
  await rerender(<Shape shape={shapes.heart} size={64} />);
  expect(svg().getBoundingClientRect().width).toBe(64);
  await rerender(<Shape shape={shapes.heart} size="3rem" />);
  expect(svg().getBoundingClientRect().width).toBe(48);
});

test('is filled with the text colour', async () => {
  await render(<Shape shape={shapes.heart} style={{ color: 'rgb(1, 2, 3)' }} />);
  expect(getComputedStyle(svg()).fill).toBe('rgb(1, 2, 3)');
});

test('passes className, style and other attributes through', async () => {
  await render(
    <Shape shape={shapes.heart} className="mine" data-testid="x" style={{ opacity: 0.5 }} />,
  );
  expect(svg().classList.contains('mine')).toBe(true);
  expect(svg().getAttribute('data-testid')).toBe('x');
  expect(getComputedStyle(svg()).opacity).toBe('0.5');
});

test('morphs into a new shape, and ends exactly on it', async () => {
  const { rerender } = await render(<Shape shape={shapes.circle} />);
  await rerender(<Shape shape={shapes.cookie9Sided} />);
  // Part-way, the outline is neither shape.
  await expect
    .poll(() => d() !== outline('circle') && d() !== outline('cookie9Sided'), { timeout: 2000 })
    .toBe(true);
  await expect.poll(d, { timeout: 3000 }).toBe(outline('cookie9Sided'));
});

test('a morph overshoots, as a spring does, before it settles', async () => {
  const { rerender } = await render(<Shape shape={shapes.circle} />);
  await rerender(<Shape shape={shapes.softBurst} />);
  const samples: string[] = [];
  const stop = Date.now() + 700;
  while (Date.now() < stop) {
    samples.push(d() as string);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  // More than a few distinct frames were drawn: it ran as an animation, not a jump.
  expect(new Set(samples).size).toBeGreaterThan(10);
});

test('does not animate when animated is off', async () => {
  const { rerender } = await render(<Shape shape={shapes.circle} animated={false} />);
  await rerender(<Shape shape={shapes.heart} animated={false} />);
  expect(d()).toBe(outline('heart'));
});

test('does not animate with reduced motion', async () => {
  const matchMedia = reducedMotion();
  try {
    const { rerender } = await render(<Shape shape={shapes.circle} />);
    await rerender(<Shape shape={shapes.heart} />);
    expect(d()).toBe(outline('heart'));
  } finally {
    matchMedia.mockRestore();
  }
});

test('a change in the middle of a morph ends on the latest shape', async () => {
  const { rerender } = await render(<Shape shape={shapes.circle} />);
  await rerender(<Shape shape={shapes.heart} />);
  await new Promise((resolve) => setTimeout(resolve, 120));
  await rerender(<Shape shape={shapes.pentagon} />);
  await expect.poll(d, { timeout: 3000 }).toBe(outline('pentagon'));
});

test('re-rendering with the same shape leaves the outline alone', async () => {
  const { rerender } = await render(<Shape shape={shapes.circle} />);
  await rerender(<Shape shape={shapes.heart} animated={false} />);
  await rerender(<Shape shape={shapes.heart} animated={false} size={50} />);
  expect(d()).toBe(outline('heart'));
});

test('the spring starts at 0, overshoots 1, and has settled when it is said to', () => {
  expect(springPosition(0)).toBe(0);
  expect(springPosition(-1)).toBe(0);
  const samples = Array.from({ length: 200 }, (_, i) => springPosition(i / 100));
  expect(Math.max(...samples)).toBeGreaterThan(1.05);
  expect(springPosition(springSettleSeconds())).toBeCloseTo(1, 2);
  expect(MORPH_SPRING.dampingRatio).toBeLessThan(1);
});

test('a critically damped or overdamped spring does not overshoot', () => {
  for (const dampingRatio of [1, 1.5]) {
    const spring = { dampingRatio, stiffness: 200 };
    const samples = Array.from({ length: 300 }, (_, i) => springPosition(i / 100, spring));
    expect(Math.max(...samples)).toBeLessThanOrEqual(1 + 1e-9);
    expect(springPosition(springSettleSeconds(spring), spring)).toBeCloseTo(1, 2);
  }
});
