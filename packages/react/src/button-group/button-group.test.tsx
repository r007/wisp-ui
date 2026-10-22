import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.js';
import { ButtonGroup, type ButtonGroupProps } from './button-group.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const button = (name: string) => page.getByRole('button', { name }).element() as HTMLElement;

function Group(props: Partial<ButtonGroupProps>) {
  return (
    <ButtonGroup aria-label="Actions" {...props}>
      <Button variant="outlined">Left</Button>
      <Button variant="outlined">Middle</Button>
      <Button variant="outlined">Right</Button>
    </ButtonGroup>
  );
}

test('is a named group of buttons', async () => {
  await render(<Group />);
  await expect.element(page.getByRole('group', { name: 'Actions' })).toBeVisible();
  expect(page.getByRole('button').elements()).toHaveLength(3);
});

test('sizes its buttons together, unless a button asks for its own size', async () => {
  const { rerender } = await render(<Group />);
  expect(rect(button('Left')).height).toBe(40);
  await rerender(<Group size="large" />);
  expect(rect(button('Left')).height).toBe(96);
  await rerender(
    <ButtonGroup aria-label="Actions" size="large">
      <Button>Big</Button>
      <Button size="xsmall">Small</Button>
    </ButtonGroup>,
  );
  expect(rect(button('Big')).height).toBe(96);
  expect(rect(button('Small')).height).toBe(32);
});

test('a button outside a group is unaffected', async () => {
  await render(<Button>Alone</Button>);
  expect(button('Alone')).not.toHaveAttribute('data-connected');
  expect(rect(button('Alone')).height).toBe(40);
});

test.describe('standard', () => {
  test.for<['xsmall' | 'small' | 'medium' | 'large' | 'xlarge', number]>([
    ['xsmall', 18],
    ['small', 12],
    ['medium', 8],
    ['large', 8],
    ['xlarge', 8],
  ])('spaces %s buttons %ipx apart', async ([size, gap]) => {
    await render(<Group size={size} />);
    expect(Math.round(rect(button('Middle')).left - rect(button('Left')).right)).toBe(gap);
    expect(button('Left')).not.toHaveAttribute('data-connected');
  });
});

test.describe('connected', () => {
  test('puts buttons 2px apart', async () => {
    await render(<Group connected />);
    expect(Math.round(rect(button('Middle')).left - rect(button('Left')).right)).toBe(2);
    expect(Math.round(rect(button('Right')).left - rect(button('Middle')).right)).toBe(2);
  });

  test('rounds the ends of the group fully and the touching corners to 8px', async () => {
    await render(<Group connected />);
    const left = style(button('Left'));
    const middle = style(button('Middle'));
    const right = style(button('Right'));
    // Outer ends: fully round (half the 40px height).
    expect(px(left.borderTopLeftRadius)).toBe(20);
    expect(px(left.borderBottomLeftRadius)).toBe(20);
    expect(px(right.borderTopRightRadius)).toBe(20);
    expect(px(right.borderBottomRightRadius)).toBe(20);
    // Where they touch: small.
    expect(px(left.borderTopRightRadius)).toBe(8);
    expect(px(middle.borderTopLeftRadius)).toBe(8);
    expect(px(middle.borderTopRightRadius)).toBe(8);
    expect(px(right.borderTopLeftRadius)).toBe(8);
  });

  test('scales the touching corners with the size', async () => {
    await render(<Group connected size="large" />);
    expect(px(style(button('Middle')).borderTopLeftRadius)).toBe(16);
    expect(px(style(button('Left')).borderTopLeftRadius)).toBe(48);
  });

  test('rounds a selected toggle button fully', async () => {
    await render(
      <ButtonGroup connected aria-label="Alignment">
        <Button variant="outlined" defaultSelected>
          Left
        </Button>
        <Button variant="outlined" defaultSelected={false}>
          Right
        </Button>
      </ButtonGroup>,
    );
    await expect.poll(() => px(style(button('Left')).borderTopRightRadius)).toBe(20);
    expect(px(style(button('Right')).borderTopLeftRadius)).toBe(8);
  });
});
