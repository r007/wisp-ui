import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { shapes } from '../shapes/catalog.js';
import { cubicsToPath } from '../shapes/cubic.js';
import { LoadingIndicator } from './loading-indicator.js';
import { indicatorMorphs, indicatorScale, SEQUENCE } from './morphs.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const root = () => page.getByRole('progressbar').element() as HTMLElement;
const shape = () => root().querySelector('svg') as SVGElement;
const outline = () => root().querySelector('path') as SVGPathElement;

test('is an indeterminate progress bar, named', async () => {
  await render(<LoadingIndicator />);
  await expect.element(page.getByRole('progressbar', { name: 'Loading' })).toBeVisible();
  expect(root()).not.toHaveAttribute('aria-valuenow');
});

test('is named by aria-label', async () => {
  await render(<LoadingIndicator aria-label="Loading messages" />);
  await expect.element(page.getByRole('progressbar', { name: 'Loading messages' })).toBeVisible();
});

test('is a 48px square with a 38px shape, in the primary colour', async () => {
  await render(<LoadingIndicator />);
  expect(rect(root()).width).toBe(48);
  expect(rect(root()).height).toBe(48);
  expect(rect(shape()).width).toBe(38);
  // primary.
  expect(style(shape()).fill).toBe('rgb(103, 80, 164)');
  // Uncontained: no container colour.
  expect(style(root()).backgroundColor).toBe('rgba(0, 0, 0, 0)');
});

test('contained, sits the shape on a primary-container circle', async () => {
  await render(<LoadingIndicator contained />);
  // primary-container, on-primary-container.
  expect(style(root()).backgroundColor).toBe('rgb(234, 221, 255)');
  expect(style(shape()).fill).toBe('rgb(79, 55, 139)');
  expect(px(style(root()).borderTopLeftRadius)).toBeGreaterThanOrEqual(24);
});

test('scales to a given size', async () => {
  await render(<LoadingIndicator size={96} />);
  expect(rect(root()).width).toBe(96);
  expect(Math.round(rect(shape()).width)).toBe(76);
});

test('morphs and turns while it runs', async () => {
  await render(<LoadingIndicator />);
  const first = outline().getAttribute('d');
  const turned = () => outline().parentElement?.getAttribute('transform');
  const placed = turned();
  await expect.poll(() => outline().getAttribute('d')).not.toBe(first);
  await expect.poll(turned).not.toBe(placed);
  expect(turned()).toMatch(/rotate\(/);
  const a = outline().getAttribute('d');
  await expect.poll(() => outline().getAttribute('d')).not.toBe(a);
});

test('draws its first shape on the first render, already scaled to fit', async () => {
  // Not yet animated: the first frame is not there before the effect has run, so a still
  // render (and server rendering) must already be the right size.
  const original = window.requestAnimationFrame;
  window.requestAnimationFrame = () => 0;
  try {
    await render(<LoadingIndicator />);
    expect(outline().getAttribute('d')).toBe(cubicsToPath(shapes.softBurst.cubics));
    expect(outline().parentElement?.getAttribute('transform')).toMatch(
      /^translate\(0\.5 0\.5\) rotate\(0\) scale\(0\.\d+\)/,
    );
  } finally {
    window.requestAnimationFrame = original;
  }
});

test('stays still with reduced motion', async () => {
  const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );
  try {
    await render(<LoadingIndicator />);
    const still = outline().getAttribute('d');
    const placed = outline().parentElement?.getAttribute('transform');
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(outline().getAttribute('d')).toBe(still);
    expect(outline().parentElement?.getAttribute('transform')).toBe(placed);
  } finally {
    matchMedia.mockRestore();
  }
});

test('survives a first frame stamped before it started', async () => {
  // A frame's timestamp is when it began, which can be before the effect that asked for it ran.
  // It is delivered later, as a real frame is, never inside the call that asked for it.
  const frame = vi.spyOn(window, 'requestAnimationFrame').mockImplementationOnce((callback) => {
    setTimeout(() => callback(0), 0);
    return 1;
  });
  try {
    await render(<LoadingIndicator />);
    await expect.poll(() => outline().getAttribute('d')).toMatch(/^M/);
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Still running: the frame it asked for next arrived and drew without throwing.
    expect(outline().parentElement?.getAttribute('transform')).toMatch(/rotate\(/);
  } finally {
    frame.mockRestore();
  }
});

test('stops animating once removed', async () => {
  const frames = vi.spyOn(window, 'cancelAnimationFrame');
  const { unmount } = await render(<LoadingIndicator />);
  await unmount();
  expect(frames).toHaveBeenCalled();
  frames.mockRestore();
});

test('forwards a ref and props', async () => {
  let node: HTMLDivElement | null = null;
  await render(
    <LoadingIndicator
      data-testid="spinner"
      ref={(el) => {
        node = el;
      }}
    />,
  );
  expect(node).toBe(root());
  expect(root().getAttribute('data-testid')).toBe('spinner');
});

test.describe('shapes', () => {
  test('there are seven, all different, from the catalogue', () => {
    expect(SEQUENCE).toHaveLength(7);
    expect(new Set(SEQUENCE.map((name) => cubicsToPath(shapes[name].cubics))).size).toBe(7);
  });

  test('each morph goes from one to the next, and the last back to the first', () => {
    const morphs = indicatorMorphs();
    expect(morphs).toHaveLength(7);
    morphs.forEach((morph, i) => {
      expect(morph.start).toBe(shapes[SEQUENCE[i] as (typeof SEQUENCE)[number]]);
      expect(morph.end).toBe(shapes[SEQUENCE[(i + 1) % 7] as (typeof SEQUENCE)[number]]);
    });
    expect(indicatorMorphs()).toBe(morphs);
  });

  test('is scaled so that any shape, turned any way, stays inside the box', () => {
    const scale = indicatorScale();
    expect(scale).toBeLessThanOrEqual(1);
    expect(scale).toBeGreaterThan(0.5);
    for (const name of SEQUENCE) {
      const polygon = shapes[name];
      for (const cubic of polygon.cubics) {
        for (const t of [0, 0.25, 0.5, 0.75]) {
          const { x, y } = cubic.pointAt(t);
          const reach = Math.hypot(x - polygon.center.x, y - polygon.center.y) * scale;
          expect(reach, name).toBeLessThanOrEqual(0.5 + 1e-6);
        }
      }
    }
  });
});
