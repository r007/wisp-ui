import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { CircularProgress } from './circular-progress.js';
import { LinearProgress } from './linear-progress.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const bar = () => page.getByRole('progressbar').element();
const part = (index: number) => bar().children[index] as HTMLElement;
const [TRACK, BAR, STOP] = [0, 1, 2];
/** Keyframe names are scoped by CSS Modules (`wisp-…__wave__hash`), so match by part. */
const animates = (el: Element, name: string) =>
  el
    .getAnimations({ subtree: true })
    .some((a) => (a as CSSAnimation).animationName.includes(`__${name}__`));

test.describe('LinearProgress', () => {
  test('is a named progressbar with its value and range', async () => {
    await render(<LinearProgress aria-label="Uploading" value={40} />);
    const el = page.getByRole('progressbar', { name: 'Uploading' });
    await expect.element(el).toHaveAttribute('aria-valuenow', '40');
    await expect.element(el).toHaveAttribute('aria-valuemin', '0');
    await expect.element(el).toHaveAttribute('aria-valuemax', '100');
  });

  test('has no value while indeterminate', async () => {
    await render(<LinearProgress aria-label="Loading" />);
    expect(bar()).not.toHaveAttribute('aria-valuenow');
  });

  test('clamps the value into its range, and honours max', async () => {
    const { rerender } = await render(<LinearProgress aria-label="x" value={150} />);
    expect(bar()).toHaveAttribute('aria-valuenow', '100');
    await rerender(<LinearProgress aria-label="x" value={-5} />);
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
    await rerender(<LinearProgress aria-label="x" value={3} max={4} />);
    expect(bar()).toHaveAttribute('aria-valuemax', '4');
  });

  test('is 4px tall, and 10px when wavy', async () => {
    const { rerender } = await render(<LinearProgress aria-label="x" value={50} />);
    expect(rect(bar()).height).toBe(4);
    await rerender(<LinearProgress aria-label="x" value={50} wavy />);
    expect(rect(bar()).height).toBe(10);
  });

  test('fills the bar to the value, leaves a 4px gap, then the track and a stop dot', async () => {
    await render(
      <div style={{ inlineSize: 200 }}>
        <LinearProgress aria-label="x" value={50} />
      </div>,
    );
    await expect.poll(() => rect(part(BAR)).width).toBe(100);
    expect(rect(part(BAR)).height).toBe(4);
    // The track starts a gap after the bar and runs to the end.
    await expect.poll(() => rect(part(TRACK)).left - rect(part(BAR)).right).toBe(4);
    expect(rect(part(TRACK)).right).toBe(rect(bar()).right);
    expect(rect(part(STOP)).width).toBe(4);
    expect(rect(part(STOP)).right).toBe(rect(bar()).right);
  });

  test('paints the active bar primary and the track secondary-container', async () => {
    await render(<LinearProgress aria-label="x" value={50} />);
    expect(style(part(BAR)).backgroundColor).toBe('rgb(103, 80, 164)');
    expect(style(part(TRACK)).backgroundColor).toBe('rgb(232, 222, 248)');
  });

  test('has no gap at zero, and nothing to stop at when complete', async () => {
    const { rerender } = await render(
      <div style={{ inlineSize: 200 }}>
        <LinearProgress aria-label="x" value={0} />
      </div>,
    );
    expect(rect(part(BAR)).width).toBe(0);
    expect(rect(part(TRACK)).left).toBe(rect(bar()).left);
    await rerender(
      <div style={{ inlineSize: 200 }}>
        <LinearProgress aria-label="x" value={100} />
      </div>,
    );
    await expect.poll(() => rect(part(BAR)).width).toBe(200);
    expect(style(part(STOP)).opacity).toBe('0');
  });

  test('follows the value as it changes', async () => {
    const { rerender } = await render(
      <div style={{ inlineSize: 200 }}>
        <LinearProgress aria-label="x" value={25} />
      </div>,
    );
    await expect.poll(() => rect(part(BAR)).width).toBe(50);
    await rerender(
      <div style={{ inlineSize: 200 }}>
        <LinearProgress aria-label="x" value={75} />
      </div>,
    );
    await expect.poll(() => rect(part(BAR)).width).toBe(150);
  });

  test('draws a moving wave when wavy', async () => {
    await render(<LinearProgress aria-label="x" value={50} wavy />);
    expect(getComputedStyle(part(BAR), '::before').maskImage).toContain('svg');
    expect(animates(bar(), 'wave')).toBe(true);
  });

  test('draws the wave with no gap between its periods, wherever it has travelled to', async () => {
    await render(
      <div style={{ inlineSize: 400, background: 'white' }}>
        <LinearProgress aria-label="x" value={100} wavy />
      </div>,
    );
    // Freeze the wave part-way through a period, off the pixel grid.
    for (const animation of bar().getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 321;
    }
    // Not saved to disk, the screenshot comes back as base64 PNG.
    const base64 = await page.screenshot({ element: bar(), save: false });
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    // How far each pixel is from the white page, so a pixel of the bar's colour counts as 1.
    const ink = (x: number, y: number) => {
      const at = (y * canvas.width + x) * 4;
      return 3 * 255 - (pixels[at] ?? 0) - (pixels[at + 1] ?? 0) - (pixels[at + 2] ?? 0);
    };
    let solid = 0;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) solid = Math.max(solid, ink(x, y));
    expect(solid).toBeGreaterThan(300);
    // The stroke is 4px thick and never thinner than that vertically, so each column holds at
    // least ~4px of ink. A wedge cut out of the stroke at a period's edge left only ~3.3.
    const coverage = Array.from({ length: canvas.width }, (_, x) => {
      let sum = 0;
      for (let y = 0; y < canvas.height; y++) sum += ink(x, y) / solid;
      return sum;
    });
    expect(Math.min(...coverage)).toBeGreaterThan(3.8);
  });

  test('sweeps a bar across while indeterminate, with no stop dot', async () => {
    await render(<LinearProgress aria-label="x" />);
    expect(animates(bar(), 'sweep')).toBe(true);
    expect(style(part(STOP)).display).toBe('none');
  });
});

test.describe('CircularProgress', () => {
  const arcs = (el: Element) => Array.from(el.querySelectorAll('path')) as SVGPathElement[];

  test('is a named progressbar with its value', async () => {
    await render(<CircularProgress aria-label="Loading" value={30} />);
    await expect
      .element(page.getByRole('progressbar', { name: 'Loading' }))
      .toHaveAttribute('aria-valuenow', '30');
  });

  test('has no value while indeterminate, and turns', async () => {
    await render(<CircularProgress aria-label="Loading" />);
    expect(bar()).not.toHaveAttribute('aria-valuenow');
    expect(animates(bar(), 'turn')).toBe(true);
    // Only the arc: the track is hidden.
    expect(arcs(bar()).filter((path) => style(path).display !== 'none')).toHaveLength(1);
  });

  test('is 40px, and 48px when wavy', async () => {
    const { rerender } = await render(<CircularProgress aria-label="x" value={50} />);
    expect(rect(bar()).width).toBe(40);
    await rerender(<CircularProgress aria-label="x" value={50} wavy />);
    expect(rect(bar()).width).toBe(48);
  });

  test('draws the arc primary and the track secondary-container, 4px thick, round-ended', async () => {
    await render(<CircularProgress aria-label="x" value={50} />);
    const [track, arc] = arcs(bar()) as [SVGPathElement, SVGPathElement];
    expect(style(arc).stroke).toBe('rgb(103, 80, 164)');
    expect(style(track).stroke).toBe('rgb(232, 222, 248)');
    expect(px(style(arc).strokeWidth)).toBe(4);
    expect(style(arc).strokeLinecap).toBe('round');
  });

  test('draws an arc and a track with a gap between them at the halfway mark', async () => {
    await render(<CircularProgress aria-label="x" value={50} />);
    const [track, arc] = arcs(bar()) as [SVGPathElement, SVGPathElement];
    const arcLength = px(arc.getAttribute('stroke-dasharray') ?? '0');
    const trackLength = px(track.getAttribute('stroke-dasharray') ?? '0');
    // Each is just under half of the path, the rest being two gaps.
    expect(arcLength).toBeLessThan(50);
    expect(trackLength).toBeLessThan(50);
    expect(arcLength + trackLength).toBeGreaterThan(70);
    expect(arcLength).toBeCloseTo(trackLength, 5);
  });

  test('draws only the track at zero and only the arc when complete', async () => {
    const { rerender } = await render(<CircularProgress aria-label="x" value={0} />);
    expect(arcs(bar())).toHaveLength(1);
    expect(style(arcs(bar())[0] as SVGPathElement).stroke).toBe('rgb(232, 222, 248)');
    await rerender(<CircularProgress aria-label="x" value={100} />);
    expect(arcs(bar())).toHaveLength(1);
    expect(style(arcs(bar())[0] as SVGPathElement).stroke).toBe('rgb(103, 80, 164)');
  });

  test('is wavy when asked: a longer, rippled path that slowly turns', async () => {
    const flat = await render(<CircularProgress aria-label="flat" value={50} />);
    const flatLength = (flat.container.querySelector('path') as SVGPathElement).getTotalLength();
    await flat.unmount();
    const wavy = await render(<CircularProgress aria-label="wavy" value={50} wavy />);
    const wavyPath = wavy.container.querySelector('path') as SVGPathElement;
    expect(wavyPath.getTotalLength()).toBeGreaterThan(flatLength);
    expect(animates(wavy.container, 'turn')).toBe(true);
  });
});
