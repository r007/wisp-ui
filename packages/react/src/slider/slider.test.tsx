import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Slider } from './slider.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const input = () => page.getByRole('slider').element() as HTMLInputElement;
const root = () => input().parentElement as HTMLElement;
const part = (name: 'active' | 'inactive' | 'stop' | 'handle') => {
  const track = root().querySelector('[aria-hidden="true"]') as HTMLElement;
  return track.children[['active', 'inactive', 'stop', 'handle'].indexOf(name)] as HTMLElement;
};
const bubble = () => root().querySelector('output') as HTMLElement;

/** A fixed width, so positions can be computed. */
const Wide = ({ children }: { children: React.ReactNode }) => (
  <div style={{ inlineSize: 300 }}>{children}</div>
);

function ControlledSlider() {
  const [value, setValue] = useState(20);
  return (
    <Slider
      aria-label="Volume"
      value={value}
      onValueChange={(next) => setValue(Math.min(next, 60))}
    />
  );
}

test('is a native range input', async () => {
  await render(<Slider aria-label="Volume" defaultValue={30} min={10} max={90} step={5} />);
  await expect.element(page.getByRole('slider', { name: 'Volume' })).toBeVisible();
  expect(input().type).toBe('range');
  expect([input().min, input().max, input().step, input().value]).toEqual(['10', '90', '5', '30']);
});

test('starts at its minimum without a default', async () => {
  await render(<Slider aria-label="Volume" min={20} />);
  expect(input().value).toBe('20');
});

test('moves with the keyboard and reports the number', async () => {
  const onValueChange = vi.fn();
  await render(<Slider aria-label="Volume" defaultValue={50} onValueChange={onValueChange} />);
  input().focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(onValueChange).toHaveBeenLastCalledWith(51);
  await userEvent.keyboard('{End}');
  expect(onValueChange).toHaveBeenLastCalledWith(100);
  await userEvent.keyboard('{Home}');
  expect(onValueChange).toHaveBeenLastCalledWith(0);
});

test('jumps to where it is pressed', async () => {
  const onValueChange = vi.fn();
  await render(
    <Wide>
      <Slider aria-label="Volume" onValueChange={onValueChange} />
    </Wide>,
  );
  await userEvent.click(input(), { position: { x: 225, y: 22 } });
  // 75% of the way along, give or take the handle's own width.
  expect(Math.abs((onValueChange.mock.lastCall?.[0] as number) - 75)).toBeLessThanOrEqual(2);
});

test('is controlled, and can refuse a value', async () => {
  await render(<ControlledSlider />);
  input().focus();
  await userEvent.keyboard('{End}');
  expect(input().value).toBe('60');
});

test('takes part in a form like any input', async () => {
  await render(
    <form data-testid="form">
      <Slider aria-label="Volume" name="volume" defaultValue={42} />
    </form>,
  );
  const data = new FormData(page.getByTestId('form').element() as HTMLFormElement);
  expect(data.get('volume')).toBe('42');
});

test('does not move when disabled', async () => {
  await render(<Slider aria-label="Volume" defaultValue={50} disabled />);
  await expect.element(page.getByRole('slider')).toBeDisabled();
});

test.describe('appearance', () => {
  test('lays the handle and the two tracks out by the value, with a gap either side', async () => {
    await render(
      <Wide>
        <Slider aria-label="Volume" defaultValue={50} />
      </Wide>,
    );
    // The handle's start edge is at 50% of (300 - 4); the tracks stop 6px short of it.
    expect(Math.round(rect(part('handle')).left - rect(root()).left)).toBe(148);
    expect(rect(part('handle')).width).toBe(4);
    expect(Math.round(rect(part('active')).width)).toBe(142);
    expect(Math.round(rect(part('inactive')).left - rect(root()).left)).toBe(158);
    expect(Math.round(rect(part('inactive')).width)).toBe(142);
  });

  test('draws a 44px-tall handle and a 16px track by default', async () => {
    await render(<Slider aria-label="Volume" defaultValue={50} />);
    expect(rect(root()).height).toBe(44);
    expect(rect(part('handle')).height).toBe(44);
    expect(rect(part('active')).height).toBe(16);
    expect(rect(part('inactive')).height).toBe(16);
  });

  test('paints the active track and handle primary, and the inactive track secondary-container', async () => {
    await render(<Slider aria-label="Volume" defaultValue={50} />);
    expect(style(part('active')).backgroundColor).toBe('rgb(103, 80, 164)');
    expect(style(part('inactive')).backgroundColor).toBe('rgb(232, 222, 248)');
    expect(style(part('handle'), '::before').backgroundColor).toBe('rgb(103, 80, 164)');
  });

  test('rounds the outer ends and squares the inner ones to 2px', async () => {
    await render(<Slider aria-label="Volume" defaultValue={50} />);
    expect(px(style(part('active')).borderTopLeftRadius)).toBe(8);
    expect(px(style(part('active')).borderTopRightRadius)).toBe(2);
    expect(px(style(part('inactive')).borderTopRightRadius)).toBe(8);
    expect(px(style(part('inactive')).borderTopLeftRadius)).toBe(2);
  });

  test.for<[string, number, number]>([
    ['small', 24, 44],
    ['medium', 40, 44],
    ['large', 56, 68],
    ['xlarge', 96, 108],
  ])('is %s: a %ipx track with a %ipx handle', async ([size, track, handle]) => {
    await render(<Slider aria-label="Volume" defaultValue={50} size={size as never} />);
    expect(rect(part('active')).height).toBe(track);
    expect(rect(part('handle')).height).toBe(handle);
    expect(rect(root()).height).toBe(handle);
  });

  test('shows an icon at the start of the active track', async () => {
    await render(
      <Wide>
        <Slider
          aria-label="Volume"
          defaultValue={50}
          size="medium"
          icon={<svg data-testid="icon" />}
        />
      </Wide>,
    );
    expect(rect(page.getByTestId('icon').element()).width).toBe(24);
    expect(rect(page.getByTestId('icon').element()).left).toBeGreaterThan(
      rect(part('active')).left,
    );
  });

  test('puts a stop dot at the end of the track, until the handle gets there', async () => {
    const { rerender } = await render(
      <Wide>
        <Slider aria-label="Volume" value={50} onValueChange={() => {}} />
      </Wide>,
    );
    expect(rect(part('stop')).width).toBe(4);
    expect(Math.round(rect(root()).right - rect(part('stop')).right)).toBe(4);
    expect(style(part('stop')).opacity).toBe('1');
    await rerender(
      <Wide>
        <Slider aria-label="Volume" value={100} onValueChange={() => {}} />
      </Wide>,
    );
    await expect.poll(() => style(part('stop')).opacity).toBe('0');
  });

  test('mirrors in right-to-left layouts', async () => {
    await render(
      <div dir="rtl" style={{ inlineSize: 300 }}>
        <Slider aria-label="Volume" defaultValue={25} />
      </div>,
    );
    // 25% from the right edge.
    expect(Math.round(rect(root()).right - rect(part('handle')).right)).toBe(74);
    expect(Math.round(rect(part('active')).right - rect(root()).right)).toBe(0);
  });

  test('narrows the handle while it is focused', async () => {
    await render(
      <>
        <button type="button">Before</button>
        <Slider aria-label="Volume" defaultValue={50} />
      </>,
    );
    expect(px(style(part('handle'), '::before').width)).toBe(4);
    page.getByRole('button', { name: 'Before' }).element().focus();
    await userEvent.tab();
    await expect.poll(() => px(style(part('handle'), '::before').width)).toBe(2);
  });

  test('fades a disabled slider', async () => {
    await render(<Slider aria-label="Volume" defaultValue={50} disabled />);
    expect(style(part('active')).backgroundColor).toMatch(/0\.38|38%/);
    expect(style(part('inactive')).backgroundColor).toMatch(/0\.12|12%/);
  });
});

test.describe('value bubble', () => {
  test('is hidden until the slider is focused, then shows the value on an inverse surface', async () => {
    await render(
      <>
        <button type="button">Before</button>
        <Slider aria-label="Volume" defaultValue={37} />
      </>,
    );
    expect(style(bubble()).opacity).toBe('0');
    page.getByRole('button', { name: 'Before' }).element().focus();
    await userEvent.tab();
    await expect.poll(() => style(bubble()).opacity).toBe('1');
    expect(bubble().textContent).toBe('37');
    expect(style(bubble()).backgroundColor).toBe('rgb(50, 47, 53)');
    expect(style(bubble()).color).toBe('rgb(245, 239, 247)');
  });

  test('sits above the handle, centred on it', async () => {
    await render(
      <Wide>
        <Slider aria-label="Volume" defaultValue={50} />
      </Wide>,
    );
    expect(rect(bubble()).bottom).toBeLessThan(rect(root()).top);
    await expect
      .poll(() => Math.round(rect(bubble()).left + rect(bubble()).width / 2))
      .toBe(Math.round(rect(part('handle')).left + 2));
  });

  test('formats the value, and describes it to assistive technology', async () => {
    await render(<Slider aria-label="Volume" defaultValue={37} formatValue={(v) => `${v}%`} />);
    expect(bubble().textContent).toBe('37%');
    expect(input()).toHaveAttribute('aria-valuetext', '37%');
  });

  test('can be left out', async () => {
    await render(<Slider aria-label="Volume" defaultValue={37} showValue={false} />);
    expect(root().querySelector('output')).toBeNull();
  });
});
