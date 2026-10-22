import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SegmentedButton, SegmentedButtonItem } from './segmented-button.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const radio = (name: string) => page.getByRole('radio', { name }).element() as HTMLInputElement;
/** The visible segment around an input. */
const segment = (input: Element) => input.closest('label') as HTMLElement;
const leading = (el: Element) => el.querySelector('[class*="leading"]') as HTMLElement;

function Views(props: Partial<React.ComponentProps<typeof SegmentedButton>>) {
  return (
    <SegmentedButton aria-label="View" {...props}>
      <SegmentedButtonItem value="day">Day</SegmentedButtonItem>
      <SegmentedButtonItem value="week">Week</SegmentedButtonItem>
      <SegmentedButtonItem value="month">Month</SegmentedButtonItem>
    </SegmentedButton>
  );
}

function ControlledViews() {
  const [value, setValue] = useState('day');
  return <Views value={value} onValueChange={(next) => setValue(next)} />;
}

test.describe('single-select', () => {
  test('is a named radio group of native radios', async () => {
    await render(<Views defaultValue="week" />);
    await expect.element(page.getByRole('radiogroup', { name: 'View' })).toBeVisible();
    expect(radio('Week').tagName).toBe('INPUT');
    expect(radio('Week').type).toBe('radio');
    await expect.element(page.getByRole('radio', { name: 'Week' })).toBeChecked();
    await expect.element(page.getByRole('radio', { name: 'Day' })).not.toBeChecked();
  });

  test('selects one at a time on click, and reports the string', async () => {
    const onValueChange = vi.fn();
    await render(<Views defaultValue="week" onValueChange={onValueChange} />);
    await userEvent.click(page.getByRole('radio', { name: 'Month' }));
    await expect.element(page.getByRole('radio', { name: 'Month' })).toBeChecked();
    await expect.element(page.getByRole('radio', { name: 'Week' })).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith('month');
  });

  test('moves between segments with the arrow keys, as radios do', async () => {
    await render(<Views defaultValue="day" />);
    radio('Day').focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(page.getByRole('radio', { name: 'Week' })).toBeChecked();
  });

  test('is controlled by value', async () => {
    await render(<ControlledViews />);
    await userEvent.click(page.getByRole('radio', { name: 'Week' }));
    await expect.element(page.getByRole('radio', { name: 'Week' })).toBeChecked();
  });

  test('submits the selected value with a form', async () => {
    await render(
      <form data-testid="form">
        <Views name="view" defaultValue="month" />
      </form>,
    );
    const data = new FormData(page.getByTestId('form').element() as HTMLFormElement);
    expect(data.get('view')).toBe('month');
  });
});

test.describe('multi-select', () => {
  test('is a group of native checkboxes that toggle independently', async () => {
    const onValueChange = vi.fn();
    await render(<Views multiple defaultValue={['day']} onValueChange={onValueChange} />);
    await expect.element(page.getByRole('group', { name: 'View' })).toBeVisible();
    await userEvent.click(page.getByRole('checkbox', { name: 'Month' }));
    await expect.element(page.getByRole('checkbox', { name: 'Month' })).toBeChecked();
    await expect.element(page.getByRole('checkbox', { name: 'Day' })).toBeChecked();
    expect(onValueChange).toHaveBeenLastCalledWith(['day', 'month']);
    await userEvent.click(page.getByRole('checkbox', { name: 'Day' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['month']);
  });
});

test('disables every segment from the group, or one at a time', async () => {
  const { rerender } = await render(<Views disabled />);
  for (const name of ['Day', 'Week', 'Month']) {
    await expect.element(page.getByRole('radio', { name })).toBeDisabled();
  }
  await rerender(
    <SegmentedButton aria-label="View">
      <SegmentedButtonItem value="a">A</SegmentedButtonItem>
      <SegmentedButtonItem value="b" disabled>
        B
      </SegmentedButtonItem>
    </SegmentedButton>,
  );
  await expect.element(page.getByRole('radio', { name: 'A' })).toBeEnabled();
  await expect.element(page.getByRole('radio', { name: 'B' })).toBeDisabled();
});

test.describe('appearance', () => {
  test('is 40px tall, with equal segments that share one border between them', async () => {
    await render(<Views defaultValue="week" />);
    const [day, week, month] = ['Day', 'Week', 'Month'].map((name) => segment(radio(name)));
    expect(rect(day as Element).height).toBe(40);
    expect(Math.round(rect(day as Element).width)).toBe(Math.round(rect(week as Element).width));
    expect(Math.round(rect(week as Element).width)).toBe(Math.round(rect(month as Element).width));
    // They abut, and only the first has a start border.
    expect(Math.round(rect(week as Element).left)).toBe(Math.round(rect(day as Element).right));
    expect(px(style(day as Element).borderLeftWidth)).toBe(1);
    expect(px(style(week as Element).borderLeftWidth)).toBe(0);
    expect(px(style(week as Element).borderRightWidth)).toBe(1);
  });

  test('rounds only the outer ends, fully', async () => {
    await render(<Views defaultValue="week" />);
    const [day, week, month] = ['Day', 'Week', 'Month'].map((name) => segment(radio(name)));
    expect(px(style(day as Element).borderTopLeftRadius)).toBe(20);
    expect(px(style(day as Element).borderTopRightRadius)).toBe(0);
    expect(px(style(week as Element).borderTopLeftRadius)).toBe(0);
    expect(px(style(month as Element).borderTopRightRadius)).toBe(20);
    expect(px(style(month as Element).borderTopLeftRadius)).toBe(0);
  });

  test('draws a 1px outline', async () => {
    await render(<Views defaultValue="week" />);
    const day = segment(radio('Day'));
    expect(px(style(day).borderTopWidth)).toBe(1);
    // outline.
    expect(style(day).borderTopColor).toBe('rgb(121, 116, 126)');
  });

  test('fills the selected segment with secondary-container', async () => {
    await render(<Views defaultValue="week" />);
    const week = segment(radio('Week'));
    expect(style(week).backgroundColor).toBe('rgb(232, 222, 248)');
    // on-secondary-container, and on-surface for an unselected one.
    expect(style(week).color).toBe('rgb(74, 68, 88)');
    expect(style(segment(radio('Day'))).color).toBe('rgb(29, 27, 32)');
    expect(style(segment(radio('Day'))).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  test('folds a check into a selected segment that has no icon', async () => {
    await render(<Views />);
    const day = segment(radio('Day'));
    expect(rect(leading(day)).width).toBe(0);
    await userEvent.click(page.getByRole('radio', { name: 'Day' }));
    await expect.poll(() => rect(leading(day)).width).toBe(18);
  });

  test('shows a segment’s own icon until it is selected, then a check instead', async () => {
    await render(
      <SegmentedButton aria-label="Layout">
        <SegmentedButtonItem value="list" icon={<svg data-testid="icon" />}>
          List
        </SegmentedButtonItem>
        <SegmentedButtonItem value="grid">Grid</SegmentedButtonItem>
      </SegmentedButton>,
    );
    const list = segment(radio('List'));
    expect(rect(leading(list)).width).toBe(18);
    const icon = page.getByTestId('icon').element().parentElement as HTMLElement;
    expect(style(icon).opacity).toBe('1');
    await userEvent.click(page.getByRole('radio', { name: 'List' }));
    await expect.poll(() => style(icon).opacity).toBe('0');
  });

  test('fades a disabled segment’s outline and label', async () => {
    await render(<Views disabled />);
    const day = segment(radio('Day'));
    expect(style(day).color).toMatch(/0\.38|38%/);
    expect(style(day).borderTopColor).toMatch(/0\.12|12%/);
  });

  test('draws the focus ring around the focused segment', async () => {
    await render(
      <>
        <button type="button">Before</button>
        <Views defaultValue="day" />
      </>,
    );
    page.getByRole('button', { name: 'Before' }).element().focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(radio('Day'));
    const day = segment(radio('Day'));
    expect(style(day).outlineStyle).toBe('solid');
    expect(px(style(day).outlineWidth)).toBe(3);
  });

  test('shows the press ripple', async () => {
    await render(<Views defaultValue="day" />);
    radio('Week').dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        buttons: 1,
        bubbles: true,
      }),
    );
    expect(segment(radio('Week')).querySelector('[data-wisp-state-layer]')).toHaveAttribute(
      'data-pressed',
    );
  });
});
