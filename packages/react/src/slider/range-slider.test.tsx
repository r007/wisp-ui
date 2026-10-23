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

test.describe('pointer', () => {
  // 300px wide with 4px handles: a handle's centre is at 2 + fraction * 296. At [20, 60] the high
  // handle's is 179.6.
  const HIGH_CENTRE = 179.6;
  /** One unit of the 0 to 100 range, in pixels. */
  const UNIT = 2.96;

  /**
   * A pointer event `x` pixels along the group. Synthetic, so a drag is driven step by step. React
   * renders a press at once, but a move in a scheduled task that Firefox may run after this
   * helper returns, so read a value a move changed with `expect.poll`.
   */
  const pointer = async (type: string, x: number, init: PointerEventInit = {}) => {
    group().dispatchEvent(
      new PointerEvent(type, {
        pointerId: 7,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: rect(group()).left + x,
        clientY: rect(group()).top + 22,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve));
  };

  test('grabs a handle from well away from its 4px width, and does not make it jump', async () => {
    await render(<Sample defaultValue={[20, 60]} />);
    // 20px beside the handle: more than the handle's width, within a 48px target.
    await pointer('pointerdown', HIGH_CENTRE + 20);
    expect(group()).toHaveAttribute('data-dragging', 'high');
    expect(high().value).toBe('60');
    // The handle keeps its place relative to the pointer: ten units on is ten units on.
    await pointer('pointermove', HIGH_CENTRE + 20 + 10 * UNIT);
    await expect.poll(() => high().value).toBe('70');
    expect(low().value).toBe('20');
    await pointer('pointerup', HIGH_CENTRE + 20 + 10 * UNIT);
    expect(group()).not.toHaveAttribute('data-dragging');
  });

  test('puts the nearer handle where the bare track is pressed, and keeps dragging it', async () => {
    await render(<Sample defaultValue={[20, 60]} />);
    // 6 units along: far from either handle, but nearer the low one.
    await pointer('pointerdown', 2 + 6 * UNIT);
    expect(group()).toHaveAttribute('data-dragging', 'low');
    expect(low().value).toBe('6');
    await pointer('pointermove', 2 + 33 * UNIT);
    await expect.poll(() => low().value).toBe('33');
    expect(high().value).toBe('60');
    await pointer('pointerup', 2 + 33 * UNIT);
  });

  test('follows the pointer past the ends of the control, and stops at the ends of the range', async () => {
    await render(<Sample defaultValue={[20, 60]} />);
    await pointer('pointerdown', HIGH_CENTRE);
    await pointer('pointermove', 900);
    await expect.poll(() => high().value).toBe('100');
    await pointer('pointermove', -400);
    // The high handle cannot pass the low one.
    await expect.poll(() => high().value).toBe('20');
    await pointer('pointerup', -400);
  });

  test('lets the high handle be pulled out of a pair that has met', async () => {
    await render(<Sample defaultValue={[50, 50]} />);
    const centre = 2 + 0.5 * 296;
    // Within the grab radius, so the handle is taken where it is, not moved to the pointer.
    await pointer('pointerdown', centre + 15);
    await pointer('pointermove', centre + 15 + 10 * UNIT);
    await pointer('pointerup', centre + 15 + 10 * UNIT);
    expect([low().value, high().value]).toEqual(['50', '60']);
  });

  test('lets the low handle be pulled out of a pair that has met', async () => {
    await render(<Sample defaultValue={[50, 50]} />);
    const centre = 2 + 0.5 * 296;
    await pointer('pointerdown', centre - 15);
    await pointer('pointermove', centre - 15 - 10 * UNIT);
    await pointer('pointerup', centre - 15 - 10 * UNIT);
    expect([low().value, high().value]).toEqual(['40', '50']);
  });

  test('shows the bubble of the handle held, and no drag state once it is let go', async () => {
    await render(<Sample formatValue={(v) => `$${v}`} />);
    const [lowBubble, highBubble] = bubbles() as [HTMLElement, HTMLElement];
    await pointer('pointerdown', HIGH_CENTRE);
    await expect.poll(() => style(highBubble).opacity).toBe('1');
    expect(style(lowBubble).opacity).toBe('0');
    await pointer('pointerup', HIGH_CENTRE);
    expect(group()).not.toHaveAttribute('data-dragging');
    // The handle keeps focus, but this is not keyboard focus, so its bubble goes.
    expect(document.activeElement).toBe(high());
    await expect.poll(() => style(highBubble).opacity).toBe('0');
  });

  test('narrows only the held handle’s bar', async () => {
    await render(<Sample />);
    const bar = (which: 'low' | 'high') =>
      px(getComputedStyle(handleOf(which), '::before').inlineSize);
    const rest = bar('high');
    await pointer('pointerdown', HIGH_CENTRE);
    await expect.poll(() => bar('high')).toBeLessThan(rest);
    expect(bar('low')).toBe(rest);
    await pointer('pointerup', HIGH_CENTRE);
    await expect.poll(() => bar('high')).toBe(rest);
  });

  test('snaps to the step', async () => {
    await render(<Sample step={5} defaultValue={[20, 60]} />);
    await pointer('pointerdown', 2 + 33 * UNIT);
    expect(low().value).toBe('35');
    await pointer('pointerup', 2 + 33 * UNIT);
  });

  test('does not report a change when a press leaves the value where it was', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await pointer('pointerdown', HIGH_CENTRE);
    await pointer('pointermove', HIGH_CENTRE + 0.5);
    await pointer('pointerup', HIGH_CENTRE + 0.5);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test('moves the focus to the held handle, so the arrow keys carry on from it', async () => {
    await render(<Sample />);
    await pointer('pointerdown', HIGH_CENTRE);
    await pointer('pointerup', HIGH_CENTRE);
    expect(document.activeElement).toBe(high());
  });

  test('measures from the right edge in a right-to-left layout', async () => {
    await render(
      <div dir="rtl" style={{ inlineSize: 300 }}>
        <RangeSlider aria-label="Price" defaultValue={[20, 60]} />
      </div>,
    );
    // 6 units from the right edge: the start of the range.
    await pointer('pointerdown', 300 - (2 + 6 * UNIT));
    expect(low().value).toBe('6');
    await pointer('pointerup', 0);
  });

  test('ignores a press when disabled', async () => {
    await render(<Sample disabled />);
    await pointer('pointerdown', HIGH_CENTRE);
    expect(group()).not.toHaveAttribute('data-dragging');
  });

  test('ignores a press with a secondary button', async () => {
    await render(<Sample />);
    await pointer('pointerdown', HIGH_CENTRE, { button: 2, buttons: 2 });
    expect(group()).not.toHaveAttribute('data-dragging');
  });

  test('can be grabbed by a real mouse a little way from the handle', async () => {
    await render(<Sample defaultValue={[20, 60]} />);
    // 15px beside the handle's centre: nothing for the native 4px thumb to catch.
    await dragUntil(
      Math.round(HIGH_CENTRE) + 15,
      Math.round(HIGH_CENTRE) + 15 + 30,
      () => Number(high().value),
      (v) => v > 65 && v < 75,
    );
    expect(low().value).toBe('20');
  });
});
