import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { RangeSlider, type RangeSliderProps } from './range-slider.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const group = () => page.getByRole('group').element() as HTMLElement;
const low = () => page.getByRole('slider', { name: 'Minimum' }).element() as HTMLInputElement;
const high = () => page.getByRole('slider', { name: 'Maximum' }).element() as HTMLInputElement;
const track = () => group().querySelector('[aria-hidden="true"]') as HTMLElement;
/** The three track segments, left to right: inactive, active, inactive. */
const segments = () => Array.from(track().children).slice(0, 3) as HTMLElement[];
const bubbles = () => Array.from(group().querySelectorAll<HTMLElement>('output'));
const handleOf = (which: 'low' | 'high') =>
  Array.from(track().children)
    .filter((el) => el.tagName === 'SPAN')
    .at(which === 'low' ? 2 : 3) as HTMLElement;

/** A fixed width, so positions can be computed. */
const Wide = ({ children }: { children: React.ReactNode }) => (
  <div style={{ inlineSize: 300 }}>{children}</div>
);
const Sample = (props: Partial<RangeSliderProps>) => (
  <Wide>
    <RangeSlider aria-label="Price" defaultValue={[20, 60]} {...props} />
  </Wide>
);

test('is a group of two native range inputs, named', async () => {
  await render(<Sample />);
  await expect.element(page.getByRole('group', { name: 'Price' })).toBeVisible();
  expect(low().type).toBe('range');
  expect(high().type).toBe('range');
  expect([low().value, high().value]).toEqual(['20', '60']);
  expect([low().min, low().max, high().min, high().max]).toEqual(['0', '100', '0', '100']);
});

test('names the handles as asked', async () => {
  await render(<Sample startLabel="From" endLabel="To" />);
  await expect.element(page.getByRole('slider', { name: 'From' })).toBeVisible();
  await expect.element(page.getByRole('slider', { name: 'To' })).toBeVisible();
});

test('starts at the whole range when given no value', async () => {
  await render(
    <Wide>
      <RangeSlider aria-label="Price" min={10} max={50} />
    </Wide>,
  );
  expect([low().value, high().value]).toEqual(['10', '50']);
});

test('moves each handle with the keyboard, and reports [low, high]', async () => {
  const onValueChange = vi.fn();
  await render(<Sample onValueChange={onValueChange} />);
  low().focus();
  await userEvent.keyboard('{ArrowRight}{ArrowRight}');
  expect(onValueChange).toHaveBeenLastCalledWith([22, 60]);
  high().focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(onValueChange).toHaveBeenLastCalledWith([22, 59]);
});

test('keeps the handles from crossing, and at least `minDistance` apart', async () => {
  await render(<Sample defaultValue={[40, 50]} minDistance={5} />);
  low().focus();
  await userEvent.keyboard('{End}');
  expect(low().value).toBe('45');
  expect(high().value).toBe('50');
  high().focus();
  await userEvent.keyboard('{Home}');
  expect(high().value).toBe('50');
});

/** Never lets the high end above 70. */
function Capped() {
  const [value, setValue] = useState<[number, number]>([10, 90]);
  return (
    <Wide>
      <RangeSlider
        aria-label="Price"
        value={value}
        onValueChange={([a, b]) => setValue([a, Math.min(b, 70)])}
      />
    </Wide>
  );
}

test('can be controlled', async () => {
  await render(<Capped />);
  expect(high().value).toBe('90');
  high().focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(high().value).toBe('70');
});

test('does nothing when disabled', async () => {
  await render(<Sample disabled />);
  expect(low()).toBeDisabled();
  expect(high()).toBeDisabled();
});

test('forwards a ref and props to the group', async () => {
  let node: HTMLDivElement | null = null;
  await render(
    <Sample
      data-testid="range"
      ref={(el) => {
        node = el;
      }}
    />,
  );
  expect(node).toBe(group());
  expect(group().getAttribute('data-testid')).toBe('range');
});

test.describe('appearance', () => {
  test('puts each handle where its value is, along the track the handles leave', async () => {
    await render(<Sample defaultValue={[0, 100]} />);
    // 300px wide, 4px handles: they run from 0 to 296.
    expect(Math.round(rect(handleOf('low')).left - rect(group()).left)).toBe(0);
    expect(Math.round(rect(handleOf('high')).left - rect(group()).left)).toBe(296);
  });

  test('draws the active track between the handles and an inactive one outside each', async () => {
    await render(<Sample defaultValue={[25, 75]} />);
    const [start, middle, end] = segments() as [HTMLElement, HTMLElement, HTMLElement];
    // primary between; secondary-container outside.
    expect(style(middle).backgroundColor).toBe('rgb(103, 80, 164)');
    expect(style(start).backgroundColor).toBe('rgb(232, 222, 248)');
    expect(style(end).backgroundColor).toBe('rgb(232, 222, 248)');
    const lowHandle = handleOf('low');
    const highHandle = handleOf('high');
    // 6px gaps either side of each handle.
    expect(Math.round(rect(lowHandle).left - rect(start).right)).toBe(6);
    expect(Math.round(rect(middle).left - rect(lowHandle).right)).toBe(6);
    expect(Math.round(rect(highHandle).left - rect(middle).right)).toBe(6);
    expect(Math.round(rect(end).left - rect(highHandle).right)).toBe(6);
    // 16px tall at the smallest size.
    expect(rect(middle).height).toBe(16);
  });

  test('rounds the outer ends fully, and the ends beside a handle to 2px', async () => {
    await render(<Sample defaultValue={[25, 75]} />);
    const [start, middle, end] = segments() as [HTMLElement, HTMLElement, HTMLElement];
    expect(px(style(start).borderTopLeftRadius)).toBe(8);
    expect(px(style(start).borderTopRightRadius)).toBe(2);
    expect(px(style(middle).borderTopLeftRadius)).toBe(2);
    expect(px(style(middle).borderTopRightRadius)).toBe(2);
    expect(px(style(end).borderTopLeftRadius)).toBe(2);
    expect(px(style(end).borderTopRightRadius)).toBe(8);
  });

  test('has no active track when the handles meet', async () => {
    await render(<Sample defaultValue={[50, 50]} />);
    expect(rect(segments()[1] as HTMLElement).width).toBe(0);
  });

  test('shows a bubble only for the handle in use', async () => {
    await render(<Sample formatValue={(v) => `$${v}`} />);
    const [lowBubble, highBubble] = bubbles() as [HTMLElement, HTMLElement];
    expect(lowBubble.textContent).toBe('$20');
    expect(highBubble.textContent).toBe('$60');
    expect(style(lowBubble).opacity).toBe('0');
    expect(style(highBubble).opacity).toBe('0');
    high().focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect.poll(() => style(highBubble).opacity).toBe('1');
    expect(style(lowBubble).opacity).toBe('0');
    // Centred over its own handle.
    expect(
      Math.abs(
        rect(highBubble).left + rect(highBubble).width / 2 - (rect(handleOf('high')).left + 2),
      ),
    ).toBeLessThan(2);
  });

  test('uses text from formatValue for the spoken value', async () => {
    await render(<Sample formatValue={(v) => `$${v}`} />);
    expect(low()).toHaveAttribute('aria-valuetext', '$20');
    expect(high()).toHaveAttribute('aria-valuetext', '$60');
  });

  test('hides the bubbles on request', async () => {
    await render(<Sample showValue={false} />);
    expect(bubbles()).toHaveLength(0);
  });

  test('hides an end stop where the handle has reached the end', async () => {
    await render(<Sample defaultValue={[0, 100]} />);
    const stops = Array.from(track().children).filter(
      (el) => el.tagName === 'SPAN' && style(el).borderRadius !== '0px' && rect(el).width === 4,
    ) as HTMLElement[];
    expect(stops).toHaveLength(2);
    expect(stops.every((stop) => style(stop).opacity === '0')).toBe(true);
  });

  test('takes the track size of the larger sizes', async () => {
    await render(<Sample size="large" />);
    expect(rect(segments()[1] as HTMLElement).height).toBe(56);
  });

  test('keeps the low handle reachable when both are at the end', async () => {
    await render(<Sample defaultValue={[100, 100]} />);
    expect(style(low()).zIndex).toBe('2');
    expect(style(high()).zIndex).toBe('1');
  });
});

test('moves the nearer handle when the track is pressed', async () => {
  await render(<Sample defaultValue={[20, 60]} />);
  const box = rect(group());
  // 5%, 80%: nearer the low handle at 20 and the high handle at 60.
  await userEvent.click(group(), { position: { x: Math.round(box.width * 0.05), y: 22 } });
  expect(Number(low().value)).toBeLessThan(15);
  expect(high().value).toBe('60');
  await userEvent.click(group(), { position: { x: Math.round(box.width * 0.8), y: 22 } });
  expect(Number(high().value)).toBeGreaterThan(70);
});

/**
 * Drags from one point of the group to another. A busy headless Firefox sometimes drops the
 * press, so the drag is tried again until `done` says the value moved.
 */
const dragUntil = (
  from: number,
  to: number,
  value: () => number,
  done: (value: number) => boolean,
) =>
  expect
    .poll(
      async () => {
        await userEvent.dragAndDrop(group(), group(), {
          sourcePosition: { x: from, y: 22 },
          targetPosition: { x: to, y: 22 },
        });
        return done(value());
      },
      { timeout: 10_000, interval: 100 },
    )
    .toBe(true);

test('drags a handle by its thumb', async () => {
  await render(<Sample defaultValue={[20, 60]} />);
  // The high handle is at 60% of the 296px of travel, plus half its width: about x = 180.
  await dragUntil(
    180,
    240,
    () => Number(high().value),
    (v) => v > 75 && v < 85,
  );
  expect(low().value).toBe('20');
});

test('can drag the low handle back from the end, where both handles are', async () => {
  await render(<Sample defaultValue={[100, 100]} />);
  await dragUntil(
    298,
    100,
    () => Number(low().value),
    (v) => v > 28 && v < 38,
  );
  expect(high().value).toBe('100');
});
