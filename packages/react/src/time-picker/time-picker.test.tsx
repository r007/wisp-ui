import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TimePicker, type TimePickerProps } from './time-picker.js';
import { TimePickerDialog } from './time-picker-dialog.js';
import type { TimeValue } from './time-value.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const picker = () => page.getByRole('group', { name: /time/i }).first().element() as HTMLElement;
const dial = () => page.getByRole('slider').element() as HTMLElement;
const hourButton = () => page.getByRole('button', { name: /^Hour/ });
const minuteButton = () => page.getByRole('button', { name: /^Minute/ });
const slot = (name: string) => picker().querySelector(`[data-slot="${name}"]`) as HTMLElement;
const numbers = () =>
  Array.from(picker().querySelectorAll<HTMLElement>('[data-slot="number"]')).map((el) =>
    el.textContent?.trim(),
  );
const selectedNumber = () =>
  picker().querySelector('[data-slot="number"][data-selected]')?.textContent?.trim();
const period = (name: 'AM' | 'PM') => page.getByRole('radio', { name });
const field = (name: 'Hour' | 'Minute') =>
  page.getByRole('textbox', { name }).element() as HTMLInputElement;

const Wide = ({ children }: { children: React.ReactNode }) => (
  <div style={{ inlineSize: 600 }}>{children}</div>
);

const NOON_THIRTY: TimeValue = { hours: 14, minutes: 35 };

function Sample(props: Partial<TimePickerProps>) {
  return (
    <Wide>
      <TimePicker defaultValue={NOON_THIRTY} orientation="vertical" {...props} />
    </Wide>
  );
}

/** A pointer event on the dial: `angle` degrees clockwise from the top, `radius` px from its centre. */
const pointer = async (
  type: string,
  angle: number,
  radius: number,
  init: PointerEventInit = {},
) => {
  const box = rect(dial());
  const theta = (angle * Math.PI) / 180;
  dial().dispatchEvent(
    new PointerEvent(type, {
      pointerId: 5,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: box.left + box.width / 2 + radius * Math.sin(theta),
      clientY: box.top + box.height / 2 - radius * Math.cos(theta),
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
  // React renders a move in a scheduled task; give it one.
  await new Promise((resolve) => setTimeout(resolve));
};

/** A press and release on the dial. */
const tap = async (angle: number, radius = 100) => {
  await pointer('pointerdown', angle, radius);
  await pointer('pointerup', angle, radius);
};

test('is a group named by its headline, with a clock, the hour and the minute', async () => {
  await render(<Sample />);
  await expect.element(page.getByRole('group', { name: 'Select time' })).toBeVisible();
  await expect.element(hourButton()).toBeVisible();
  await expect.element(minuteButton()).toBeVisible();
  await expect.element(page.getByRole('slider', { name: 'Hour' })).toBeVisible();
});

test('shows a 12-hour time unpadded, with minutes padded and the period chosen', async () => {
  await render(<Sample defaultValue={{ hours: 9, minutes: 5 }} />);
  await expect.element(page.getByRole('button', { name: 'Hour 9' })).toHaveTextContent('9');
  await expect.element(page.getByRole('button', { name: 'Minute 05' })).toHaveTextContent('05');
  await expect.element(period('AM')).toBeChecked();
  await expect.element(period('PM')).not.toBeChecked();
});

test('shows a 24-hour time padded to two digits, with no AM or PM', async () => {
  await render(<Sample hourCycle={24} defaultValue={{ hours: 9, minutes: 5 }} />);
  await expect.element(page.getByRole('button', { name: 'Hour 09' })).toHaveTextContent('09');
  expect(page.getByRole('radio').elements()).toHaveLength(0);
});

test('shows midnight and noon as 12 on a 12-hour clock', async () => {
  const { rerender } = await render(<Sample defaultValue={{ hours: 0, minutes: 0 }} />);
  await expect.element(page.getByRole('button', { name: 'Hour 12' })).toBeVisible();
  await expect.element(period('AM')).toBeChecked();
  await rerender(<Sample value={{ hours: 12, minutes: 0 }} />);
  await expect.element(page.getByRole('button', { name: 'Hour 12' })).toBeVisible();
  await expect.element(period('PM')).toBeChecked();
});

test.describe('the clock', () => {
  test('is a slider over the hours 1 to 12, then the minutes 0 to 59', async () => {
    await render(<Sample />);
    expect(dial()).toHaveAttribute('aria-label', 'Hour');
    expect(dial()).toHaveAttribute('aria-valuemin', '1');
    expect(dial()).toHaveAttribute('aria-valuemax', '12');
    expect(dial()).toHaveAttribute('aria-valuenow', '2');
    await userEvent.click(minuteButton());
    expect(dial()).toHaveAttribute('aria-label', 'Minute');
    expect(dial()).toHaveAttribute('aria-valuemin', '0');
    expect(dial()).toHaveAttribute('aria-valuemax', '59');
    expect(dial()).toHaveAttribute('aria-valuenow', '35');
  });

  test('a 24-hour clock is a slider over 0 to 23', async () => {
    await render(<Sample hourCycle={24} />);
    expect(dial()).toHaveAttribute('aria-valuemin', '0');
    expect(dial()).toHaveAttribute('aria-valuemax', '23');
    expect(dial()).toHaveAttribute('aria-valuenow', '14');
  });

  test('puts the twelve hours round the ring, 12 at the top, and the minutes in fives', async () => {
    await render(<Sample />);
    expect(numbers()).toEqual(['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
    await userEvent.click(minuteButton());
    expect(numbers()).toEqual([
      '00',
      '05',
      '10',
      '15',
      '20',
      '25',
      '30',
      '35',
      '40',
      '45',
      '50',
      '55',
    ]);
  });

  test('a 24-hour clock has an outer ring of 00 to 11 and an inner one of 12 to 23', async () => {
    await render(<Sample hourCycle={24} />);
    const ring = (name: string) =>
      Array.from(
        picker().querySelectorAll<HTMLElement>(`[data-slot="number"][data-ring="${name}"]`),
      ).map((el) => el.textContent);
    expect(ring('outer')).toEqual([
      '00',
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
    ]);
    expect(ring('inner')).toEqual([
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
    ]);
  });

  test('is 256px across, round, a surface-container-highest', async () => {
    await render(<Sample />);
    expect(rect(dial()).width).toBe(256);
    expect(rect(dial()).height).toBe(256);
    expect(style(dial()).borderTopLeftRadius).toBe('50%');
    expect(style(dial()).backgroundColor).toBe('rgb(230, 224, 233)');
  });

  test('puts the 3 o’clock number a ring’s radius to the right of the centre', async () => {
    await render(<Sample />);
    const three = Array.from(picker().querySelectorAll<HTMLElement>('[data-slot="number"]')).find(
      (el) => el.textContent === '3',
    ) as HTMLElement;
    const box = rect(dial());
    const at = rect(three);
    // 128 - 28 padding = 100px from the centre.
    expect(Math.round(at.left + at.width / 2 - (box.left + box.width / 2))).toBe(100);
    expect(Math.round(at.top + at.height / 2 - (box.top + box.height / 2))).toBe(0);
  });

  test('draws a 48px handle on the selected number, a 2px bar to the centre and an 8px dot', async () => {
    await render(<Sample defaultValue={{ hours: 15, minutes: 0 }} />);
    const handle = slot('handle');
    const box = rect(dial());
    expect(rect(handle).width).toBe(48);
    expect(style(handle).borderTopLeftRadius).toBe('50%');
    expect(style(handle).backgroundColor).toBe('rgb(103, 80, 164)');
    // 3 o'clock: 100px to the right of the centre.
    await expect.poll(() => Math.round(rect(handle).left + 24 - (box.left + 128))).toBe(100);
    expect(selectedNumber()).toBe('3');
  });

  test('turns the selected number to on-primary, over the handle', async () => {
    await render(<Sample defaultValue={{ hours: 15, minutes: 0 }} />);
    const three = picker().querySelector('[data-slot="number"][data-selected]') as HTMLElement;
    expect(style(three).color).toBe('rgb(255, 255, 255)');
    const other = picker().querySelector(
      '[data-slot="number"]:not([data-selected])',
    ) as HTMLElement;
    expect(style(other).color).toBe('rgb(29, 27, 32)');
  });

  test('keeps the handle on the nearest number, or marks a minute between them', async () => {
    await render(<Sample defaultValue={{ hours: 3, minutes: 37 }} />);
    await userEvent.click(minuteButton());
    expect(selectedNumber()).toBeUndefined();
    expect(slot('handle').children).toHaveLength(1);
  });
});

test.describe('the pointer', () => {
  test('picks the hour under it, in the period the time is in', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    // 3 o'clock, outer ring: 3 in the afternoon is 15.
    await pointer('pointerdown', 90, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 15, minutes: 35 });
    await pointer('pointerup', 90, 100);
  });

  test('picks 12 at the top: noon in the afternoon', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await pointer('pointerdown', 0, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 35 });
    await pointer('pointerup', 0, 100);
  });

  test('picks 12 at the top: midnight in the morning', async () => {
    const onValueChange = vi.fn();
    await render(<Sample defaultValue={{ hours: 9, minutes: 0 }} onValueChange={onValueChange} />);
    await pointer('pointerdown', 0, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 0, minutes: 0 });
    await pointer('pointerup', 0, 100);
  });

  test('follows a drag, and moves on to the minutes when it is lifted', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await pointer('pointerdown', 30, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 13, minutes: 35 });
    expect(dial()).toHaveAttribute('data-dragging');
    await pointer('pointermove', 120, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 16, minutes: 35 });
    await pointer('pointerup', 120, 100);
    expect(dial()).not.toHaveAttribute('data-dragging');
    // Now it turns the minutes.
    await expect.element(page.getByRole('slider', { name: 'Minute' })).toBeVisible();
    await expect.element(minuteButton()).toHaveAttribute('aria-pressed', 'true');
  });

  test('picks the minute under it while held, and settles on the nearest five when lifted', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await userEvent.click(minuteButton());
    // 6 degrees to a minute: 184 degrees is 31 (30.67 rounds up).
    await pointer('pointerdown', 184, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 31 });
    await pointer('pointerup', 184, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 30 });
  });

  test('wraps the minutes at the top: 59 and a bit rounds to 0', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await userEvent.click(minuteButton());
    await pointer('pointerdown', 359, 100);
    await pointer('pointerup', 359, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 0 });
  });

  test('chooses the ring of a 24-hour clock by how far from the centre the pointer is', async () => {
    const onValueChange = vi.fn();
    await render(<Sample hourCycle={24} onValueChange={onValueChange} />);
    // 72px out is the inner ring (12 to 23); 100px out the outer one (0 to 11).
    await pointer('pointerdown', 90, 72);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 15, minutes: 35 });
    await pointer('pointermove', 90, 100);
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 3, minutes: 35 });
    await pointer('pointerup', 90, 100);
  });

  test('ignores a press with a secondary button', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await pointer('pointerdown', 90, 100, { button: 2, buttons: 2 });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(dial()).not.toHaveAttribute('data-dragging');
  });

  test('keeps the dial focused, so the arrow keys carry on from the press', async () => {
    await render(<Sample />);
    await tap(90);
    await userEvent.click(hourButton());
    expect(document.activeElement).toBe(hourButton().element());
    await pointer('pointerdown', 90, 100, { pointerId: 9 });
    expect(document.activeElement).toBe(dial());
    await pointer('pointerup', 90, 100, { pointerId: 9 });
  });

  test('does not report a change when the pointer stays on the same hour', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    // 14:35 is on the 2.
    await pointer('pointerdown', 60, 100);
    await pointer('pointermove', 62, 100);
    await pointer('pointerup', 62, 100);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test('turns the handle the short way round, not a lap, from 11 to 12', async () => {
    await render(<Sample defaultValue={{ hours: 11, minutes: 0 }} />);
    const angle = () => slot('selector').style.getPropertyValue('--_angle');
    expect(angle()).toBe('330deg');
    await tap(0);
    await expect.poll(angle).toBe('360deg');
  });
});

test.describe('the keyboard', () => {
  test('steps the hour with the arrow keys, round the 12 hours of its period', async () => {
    const onValueChange = vi.fn();
    await render(<Sample defaultValue={{ hours: 23, minutes: 0 }} onValueChange={onValueChange} />);
    dial().focus();
    await userEvent.keyboard('{ArrowRight}');
    // 11 PM, one on: 12 in the afternoon is noon, not midnight.
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 0 });
    await userEvent.keyboard('{ArrowLeft}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 23, minutes: 0 });
  });

  test('Home and End go to 1 and 12 of the period', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    dial().focus();
    await userEvent.keyboard('{Home}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 13, minutes: 35 });
    await userEvent.keyboard('{End}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 35 });
  });

  test('steps a 24-hour clock round all 24 hours', async () => {
    const onValueChange = vi.fn();
    await render(
      <Sample
        hourCycle={24}
        defaultValue={{ hours: 23, minutes: 0 }}
        onValueChange={onValueChange}
      />,
    );
    dial().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 0, minutes: 0 });
    await userEvent.keyboard('{End}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 23, minutes: 0 });
    await userEvent.keyboard('{Home}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 0, minutes: 0 });
  });

  test('Enter on the hours moves on to the minutes', async () => {
    await render(<Sample />);
    dial().focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByRole('slider', { name: 'Minute' })).toBeVisible();
  });

  test('steps the minutes by one, wrapping at 59 and 0', async () => {
    const onValueChange = vi.fn();
    await render(<Sample defaultValue={{ hours: 1, minutes: 59 }} onValueChange={onValueChange} />);
    await userEvent.click(minuteButton());
    dial().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 1, minutes: 0 });
    await userEvent.keyboard('{ArrowLeft}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 1, minutes: 59 });
    await userEvent.keyboard('{Home}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 1, minutes: 0 });
    await userEvent.keyboard('{End}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 1, minutes: 59 });
  });

  test('can be reached with Tab, with a focus ring', async () => {
    await render(<Sample />);
    dial().focus();
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    expect(dial()).toHaveFocus();
    expect(style(dial()).outlineStyle).toBe('solid');
    expect(px(style(dial()).outlineWidth)).toBe(3);
  });
});

test.describe('the hour and minute buttons', () => {
  test('say what the clock turns, and change it when pressed', async () => {
    await render(<Sample />);
    await expect.element(hourButton()).toHaveAttribute('aria-pressed', 'true');
    await expect.element(minuteButton()).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(minuteButton());
    await expect.element(minuteButton()).toHaveAttribute('aria-pressed', 'true');
    await expect.element(hourButton()).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(hourButton());
    expect(dial()).toHaveAttribute('aria-label', 'Hour');
  });

  test('are 96x80 on a 12-hour clock and 114 wide on a 24-hour one', async () => {
    const { rerender } = await render(<Sample />);
    expect(rect(hourButton().element()).width).toBe(96);
    expect(rect(hourButton().element()).height).toBe(80);
    expect(rect(minuteButton().element()).width).toBe(96);
    await rerender(<Sample hourCycle={24} />);
    expect(rect(hourButton().element()).width).toBe(114);
  });

  test('colour the one that is turning primary-container, and the other surface-container-highest', async () => {
    await render(<Sample />);
    expect(style(hourButton().element()).backgroundColor).toBe('rgb(234, 221, 255)');
    expect(style(hourButton().element()).color).toBe('rgb(79, 55, 139)');
    expect(style(minuteButton().element()).backgroundColor).toBe('rgb(230, 224, 233)');
    expect(style(minuteButton().element()).color).toBe('rgb(29, 27, 32)');
    expect(px(style(hourButton().element()).borderTopLeftRadius)).toBe(8);
  });
});

test.describe('AM and PM', () => {
  test('is a radio group of two, 52x80, with 8px corners and an outline', async () => {
    await render(<Sample />);
    const group = page.getByRole('radiogroup', { name: 'AM or PM' }).element() as HTMLElement;
    expect(rect(group).width).toBe(52);
    expect(rect(group).height).toBe(80);
    expect(px(style(group).borderTopLeftRadius)).toBe(8);
    expect(style(group).borderTopWidth).toBe('1px');
    expect(page.getByRole('radio').elements()).toHaveLength(2);
  });

  test('changing it moves the time by twelve hours and keeps the rest', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await userEvent.click(period('AM'));
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 2, minutes: 35 });
    await expect.element(period('AM')).toBeChecked();
    await userEvent.click(period('PM'));
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 35 });
  });

  test('keeps noon in the afternoon and midnight in the morning as it changes', async () => {
    const onValueChange = vi.fn();
    await render(<Sample defaultValue={{ hours: 0, minutes: 0 }} onValueChange={onValueChange} />);
    await userEvent.click(period('PM'));
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 0 });
    await userEvent.click(period('AM'));
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 0, minutes: 0 });
  });

  test('colours the one chosen tertiary-container', async () => {
    await render(<Sample />);
    const label = (name: 'AM' | 'PM') => period(name).element().closest('label') as HTMLElement;
    expect(style(label('PM')).backgroundColor).toBe('rgb(255, 216, 228)');
    expect(style(label('PM')).color).toBe('rgb(99, 59, 72)');
    expect(style(label('AM')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  test('moves with the arrow keys like any radio group', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    period('PM').element().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 2, minutes: 35 });
  });
});

test.describe('text fields', () => {
  test('replace the clock with an hour and a minute field', async () => {
    await render(<Sample mode="input" />);
    await expect.element(page.getByRole('group', { name: 'Enter time' })).toBeVisible();
    expect(page.getByRole('slider').elements()).toHaveLength(0);
    expect(field('Hour').value).toBe('2');
    expect(field('Minute').value).toBe('35');
    expect(rect(field('Hour')).width).toBe(96);
    expect(rect(field('Hour')).height).toBe(72);
    expect(rect(page.getByRole('radiogroup').element()).height).toBe(72);
  });

  test('are named by their visible labels', async () => {
    await render(<Sample mode="input" />);
    await expect.element(page.getByLabelText('Hour')).toBeVisible();
    await expect.element(page.getByLabelText('Minute')).toBeVisible();
  });

  test('take a typed hour, keep the period, and move on to the minutes', async () => {
    const onValueChange = vi.fn();
    await render(<Sample mode="input" onValueChange={onValueChange} />);
    field('Hour').focus();
    await userEvent.keyboard('9');
    // 9 in the afternoon, and no hour starts with 9 on a 12-hour clock: on to the minutes.
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 21, minutes: 35 });
    expect(document.activeElement).toBe(field('Minute'));
  });

  test('wait for a second digit after a 1, which could be 10, 11 or 12', async () => {
    const onValueChange = vi.fn();
    await render(<Sample mode="input" onValueChange={onValueChange} />);
    field('Hour').focus();
    await userEvent.keyboard('1');
    expect(document.activeElement).toBe(field('Hour'));
    await userEvent.keyboard('2');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 35 });
    expect(document.activeElement).toBe(field('Minute'));
  });

  test('take a typed minute', async () => {
    const onValueChange = vi.fn();
    await render(<Sample mode="input" onValueChange={onValueChange} />);
    field('Minute').focus();
    await userEvent.keyboard('07');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 7 });
  });

  test('select what is there when focused, so typing replaces it', async () => {
    await render(<Sample mode="input" />);
    field('Minute').focus();
    expect(field('Minute').selectionStart).toBe(0);
    expect(field('Minute').selectionEnd).toBe(2);
  });

  test('mark an hour the clock cannot have as invalid, and go back to the last good one on blur', async () => {
    const onValueChange = vi.fn();
    await render(<Sample mode="input" onValueChange={onValueChange} />);
    field('Hour').focus();
    // The 1 is an hour (1 PM) and is taken; the 13 it becomes is not.
    await userEvent.keyboard('13');
    expect(field('Hour')).toHaveAttribute('aria-invalid', 'true');
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 13, minutes: 35 });
    field('Hour').blur();
    await expect.poll(() => field('Hour').value).toBe('1');
    expect(field('Hour')).not.toHaveAttribute('aria-invalid');
  });

  test('refuse minutes over 59, and anything but digits', async () => {
    const onValueChange = vi.fn();
    await render(<Sample mode="input" onValueChange={onValueChange} />);
    field('Minute').focus();
    await userEvent.keyboard('6a');
    expect(field('Minute').value).toBe('6');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 6 });
    await userEvent.keyboard('0');
    expect(field('Minute')).toHaveAttribute('aria-invalid', 'true');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 6 });
  });

  test('step with the arrow keys, wrapping', async () => {
    const onValueChange = vi.fn();
    await render(
      <Sample
        mode="input"
        defaultValue={{ hours: 12, minutes: 59 }}
        onValueChange={onValueChange}
      />,
    );
    field('Minute').focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 0 });
    field('Hour').focus();
    // 12 in the afternoon: one on is 1 PM.
    await userEvent.keyboard('{ArrowUp}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 13, minutes: 0 });
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 23, minutes: 0 });
  });

  test('a 24-hour field takes 0 to 23, and moves on once it has two digits', async () => {
    const onValueChange = vi.fn();
    await render(<Sample mode="input" hourCycle={24} onValueChange={onValueChange} />);
    expect(field('Hour').value).toBe('14');
    field('Hour').focus();
    await userEvent.keyboard('23');
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 23, minutes: 35 });
    expect(document.activeElement).toBe(field('Minute'));
  });

  test('a 24-hour field refuses 24', async () => {
    const onValueChange = vi.fn();
    await render(<Sample mode="input" hourCycle={24} onValueChange={onValueChange} />);
    field('Hour').focus();
    await userEvent.keyboard('24');
    expect(field('Hour')).toHaveAttribute('aria-invalid', 'true');
    // The 2 was an hour; the 24 it became is not, so nothing newer than that was reported.
    expect(onValueChange).toHaveBeenLastCalledWith({ hours: 2, minutes: 35 });
  });

  test('draw the focused field in primary-container with a 2px primary outline', async () => {
    await render(<Sample mode="input" />);
    expect(style(field('Hour')).backgroundColor).toBe('rgb(230, 224, 233)');
    field('Hour').focus();
    // The fill is a spring: it has not arrived when the focus lands.
    await expect.poll(() => style(field('Hour')).backgroundColor).toBe('rgb(234, 221, 255)');
    expect(style(field('Hour')).outlineColor).toBe('rgb(103, 80, 164)');
    expect(px(style(field('Hour')).outlineWidth)).toBe(2);
  });
});

test.describe('switching between the clock and the fields', () => {
  test('has a button that says where it goes, and goes there and back', async () => {
    await render(<Sample />);
    await userEvent.click(page.getByRole('button', { name: 'Switch to text input' }));
    await expect.element(page.getByRole('group', { name: 'Enter time' })).toBeVisible();
    expect(field('Hour').value).toBe('2');
    await userEvent.click(page.getByRole('button', { name: 'Switch to clock' }));
    await expect.element(page.getByRole('slider', { name: 'Hour' })).toBeVisible();
  });

  test('starts from the hours again', async () => {
    await render(<Sample />);
    await userEvent.click(minuteButton());
    await userEvent.click(page.getByRole('button', { name: 'Switch to text input' }));
    await userEvent.click(page.getByRole('button', { name: 'Switch to clock' }));
    expect(dial()).toHaveAttribute('aria-label', 'Hour');
  });

  test('keeps the time, and asks the parent when the mode is controlled', async () => {
    const onModeChange = vi.fn();
    await render(<Sample mode="dial" onModeChange={onModeChange} />);
    await userEvent.click(page.getByRole('button', { name: 'Switch to text input' }));
    expect(onModeChange).toHaveBeenCalledWith('input');
    // Controlled: it stays on the clock until the parent changes it.
    expect(page.getByRole('slider').elements()).toHaveLength(1);
  });

  test('can do without the button', async () => {
    await render(<Sample showModeToggle={false} />);
    expect(page.getByRole('button', { name: /Switch to/ }).elements()).toHaveLength(0);
  });
});

test.describe('layout', () => {
  test('stacks the clock under the time when vertical', async () => {
    await render(<Sample orientation="vertical" />);
    expect(rect(dial()).top).toBeGreaterThan(rect(hourButton().element()).bottom);
    expect(
      Math.abs(rect(dial()).left + 128 - (rect(picker()).left + rect(picker()).width / 2)),
    ).toBeLessThan(2);
  });

  test('puts the clock beside the time when horizontal, with a horizontal AM and PM', async () => {
    await render(<Sample orientation="horizontal" />);
    expect(rect(dial()).left).toBeGreaterThan(rect(hourButton().element()).right);
    const group = page.getByRole('radiogroup').element() as HTMLElement;
    expect(rect(group).width).toBe(216);
    expect(rect(group).height).toBe(38);
  });

  test('is a 28px-cornered surface-container-high with 24px of padding', async () => {
    await render(<Sample />);
    expect(px(style(picker()).borderTopLeftRadius)).toBe(28);
    expect(style(picker()).backgroundColor).toBe('rgb(236, 230, 240)');
    expect(px(style(picker()).paddingLeft)).toBe(24);
  });

  test('casts no shadow of its own, outside a dialog', async () => {
    await render(<Sample />);
    expect(/[1-9]\d*(?:\.\d+)?px/.test(style(picker()).boxShadow)).toBe(false);
  });
});

function Evening() {
  const [value, setValue] = useState<TimeValue>({ hours: 8, minutes: 0 });
  return (
    <>
      <button type="button" onClick={() => setValue({ hours: 20, minutes: 15 })}>
        Evening
      </button>
      <Sample value={value} onValueChange={setValue} />
    </>
  );
}

test.describe('controlled use', () => {
  test('reports each change and stays put until the parent sets it', async () => {
    const onValueChange = vi.fn();
    await render(
      <Sample
        value={{ hours: 9, minutes: 0 }}
        defaultValue={undefined}
        onValueChange={onValueChange}
      />,
    );
    await tap(90);
    expect(onValueChange).toHaveBeenCalledWith({ hours: 3, minutes: 0 });
    await expect.element(page.getByRole('button', { name: 'Hour 9' })).toBeVisible();
  });

  test('follows a value it is given', async () => {
    await render(<Evening />);
    await userEvent.click(page.getByRole('button', { name: 'Evening' }));
    await expect.element(page.getByRole('button', { name: 'Hour 8' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Minute 15' })).toBeVisible();
    await expect.element(period('PM')).toBeChecked();
  });
});

test('takes its texts from labels, for translating', async () => {
  await render(
    <Sample
      labels={{
        headline: 'Heure',
        hour: 'Heures',
        minute: 'Minutes',
        am: 'matin',
        pm: 'soir',
        period: 'Matin ou soir',
        useKeyboard: 'Saisir au clavier',
      }}
    />,
  );
  await expect.element(page.getByRole('group', { name: 'Heure' })).toBeVisible();
  await expect.element(page.getByRole('slider', { name: 'Heures' })).toBeVisible();
  await expect.element(page.getByRole('radiogroup', { name: 'Matin ou soir' })).toBeVisible();
  await expect.element(page.getByRole('radio', { name: 'soir' })).toBeChecked();
  await expect.element(page.getByRole('button', { name: 'Saisir au clavier' })).toBeVisible();
});

test('takes a headline of its own', async () => {
  await render(<Sample headline="Alarm" />);
  await expect.element(page.getByRole('group', { name: 'Alarm' })).toBeVisible();
});

test('forwards a ref, a class and props to its element', async () => {
  let node: HTMLDivElement | null = null;
  await render(
    <Sample
      className="mine"
      data-testid="picker"
      ref={(el) => {
        node = el;
      }}
    />,
  );
  expect(node).toBe(picker());
  expect(picker()).toHaveClass('mine');
  expect(picker().getAttribute('data-testid')).toBe('picker');
});

function Host(props: { onConfirm?: (value: TimeValue) => void; initial?: TimeValue }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(props.initial ?? { hours: 8, minutes: 30 });
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <output data-testid="time">
        {time.hours}:{time.minutes}
      </output>
      <TimePickerDialog
        open={open}
        onOpenChange={setOpen}
        value={time}
        onConfirm={(next) => {
          setTime(next);
          props.onConfirm?.(next);
        }}
      />
    </>
  );
}

test.describe('dialog', () => {
  const dialogEl = () => document.querySelector('dialog') as HTMLDialogElement;

  const open = async () => {
    await userEvent.click(page.getByRole('button', { name: 'Open' }));
    await expect.poll(() => dialogEl().open).toBe(true);
  };

  test('is a modal dialog named by the headline, with Cancel and OK', async () => {
    await render(<Host />);
    await open();
    expect(dialogEl().matches(':modal')).toBe(true);
    await expect.element(page.getByRole('dialog', { name: 'Select time' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'OK' })).toBeVisible();
  });

  test('starts from the value it is given, and casts the picker’s shadow', async () => {
    await render(<Host />);
    await open();
    await expect.element(page.getByRole('button', { name: 'Hour 8' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Minute 30' })).toBeVisible();
    await expect.element(period('AM')).toBeChecked();
    expect(/[1-9]\d*(?:\.\d+)?px/.test(style(picker()).boxShadow)).toBe(true);
  });

  test('reports the chosen time, and closes, when OK is pressed', async () => {
    const onConfirm = vi.fn();
    await render(<Host onConfirm={onConfirm} />);
    await open();
    await tap(180);
    await userEvent.click(period('PM'));
    await userEvent.click(page.getByRole('button', { name: 'OK' }));
    // 6 o'clock, in the afternoon; the minutes were 30.
    expect(onConfirm).toHaveBeenCalledWith({ hours: 18, minutes: 30 });
    await expect.poll(() => dialogEl().open).toBe(false);
    await expect.element(page.getByTestId('time')).toHaveTextContent('18:30');
  });

  test('reports nothing when it is cancelled, and the next opening starts afresh', async () => {
    const onConfirm = vi.fn();
    await render(<Host onConfirm={onConfirm} />);
    await open();
    await tap(180);
    await userEvent.click(minuteButton());
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await expect.poll(() => dialogEl().open).toBe(false);
    await open();
    // The value it was given, on the hours, not where it was left.
    await expect.element(page.getByRole('button', { name: 'Hour 8' })).toBeVisible();
    expect(dial()).toHaveAttribute('aria-label', 'Hour');
  });

  test('closes on Escape without reporting anything', async () => {
    const onConfirm = vi.fn();
    await render(<Host onConfirm={onConfirm} />);
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogEl().open).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('closes on a press on the scrim', async () => {
    await render(<Host />);
    await open();
    await userEvent.click(dialogEl(), { position: { x: 2, y: 2 }, force: true });
    await expect.poll(() => dialogEl().open).toBe(false);
  });

  test('moves focus inside when opened, and back to the opener when closed', async () => {
    await render(<Host />);
    await open();
    expect(dialogEl().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialogEl().open).toBe(false);
    await expect.element(page.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  test('takes translated Cancel and OK texts', async () => {
    await render(<TimePickerDialog open labels={{ cancel: 'Annuler', confirm: 'Valider' }} />);
    await expect.element(page.getByRole('button', { name: 'Annuler' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Valider' })).toBeVisible();
  });
});
