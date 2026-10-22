import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { LoadingIndicator } from './loading-indicator.js';
import { blend, POINTS, pathOf, SHAPES, spring } from './shapes.js';

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
  await expect.poll(() => outline().getAttribute('d')).not.toBe(first);
  await expect.poll(turned).toMatch(/^rotate\(/);
  const a = outline().getAttribute('d');
  await expect.poll(() => outline().getAttribute('d')).not.toBe(a);
});

test('draws its first shape on the first render', async () => {
  await render(<LoadingIndicator />);
  expect(outline().getAttribute('d')?.startsWith('M')).toBe(true);
  expect(outline().getAttribute('d')?.endsWith('Z')).toBe(true);
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
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(outline().getAttribute('d')).toBe(still);
    expect(outline().parentElement?.getAttribute('transform')).toBeNull();
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
    expect(outline().parentElement?.getAttribute('transform')).toMatch(/^rotate\(/);
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
  test('there are seven, each sampled at the same angles', () => {
    expect(SHAPES).toHaveLength(7);
    for (const s of SHAPES) expect(s).toHaveLength(POINTS);
  });

  test('each fits the box, with room to overshoot, and is not a sliver', () => {
    for (const s of SHAPES) {
      expect(Math.max(...s)).toBeCloseTo(0.94, 5);
      expect(Math.min(...s)).toBeGreaterThan(0.4);
    }
  });

  test('are all different', () => {
    expect(new Set(SHAPES.map((s) => pathOf(s))).size).toBe(7);
  });

  test('blend is the first at 0 and the second at 1', () => {
    const [a, b] = SHAPES as [(typeof SHAPES)[number], (typeof SHAPES)[number]];
    expect(blend(a, b, 0)).toEqual([...a]);
    expect(blend(a, b, 1)).toEqual([...b]);
    expect(blend(a, b, 0.5)[3]).toBeCloseTo(((a[3] as number) + (b[3] as number)) / 2, 10);
  });

  test('a path is a closed curve of one segment per point', () => {
    const d = pathOf(SHAPES[0] as (typeof SHAPES)[number]);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.split('C')).toHaveLength(POINTS + 1);
  });

  test('the spring goes from 0 to 1 and overshoots on the way', () => {
    expect(spring(0)).toBe(0);
    expect(spring(1)).toBe(1);
    expect(spring(-1)).toBe(0);
    expect(spring(2)).toBe(1);
    expect(Math.max(...Array.from({ length: 100 }, (_, i) => spring(i / 100)))).toBeGreaterThan(1);
    expect(spring(0.99)).toBeCloseTo(1, 1);
  });
});
