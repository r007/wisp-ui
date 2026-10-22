import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Divider } from './divider.js';

const px = (value: string) => Number.parseFloat(value);

test('is a separator', async () => {
  await render(<Divider />);
  const rule = page.getByRole('separator');
  await expect.element(rule).toBeVisible();
  expect(rule.element().tagName).toBe('HR');
});

test('is a 1px outline-variant rule', async () => {
  await render(<Divider />);
  const rule = page.getByRole('separator').element();
  expect(rule.getBoundingClientRect().height).toBe(1);
  expect(getComputedStyle(rule).backgroundColor).toBe('rgb(202, 196, 208)');
});

test('can be vertical, stretching to its container', async () => {
  await render(
    <div style={{ display: 'flex', blockSize: 40 }}>
      <Divider vertical />
    </div>,
  );
  const rule = page.getByRole('separator').element();
  expect(rule).toHaveAttribute('aria-orientation', 'vertical');
  expect(rule.getBoundingClientRect().width).toBe(1);
  expect(rule.getBoundingClientRect().height).toBe(40);
});

test('insets by 16px from the start, end or both', async () => {
  const { rerender } = await render(<Divider inset="start" />);
  const rule = page.getByRole('separator').element();
  expect(px(getComputedStyle(rule).marginInlineStart)).toBe(16);
  expect(px(getComputedStyle(rule).marginInlineEnd)).toBe(0);

  await rerender(<Divider inset="end" />);
  expect(px(getComputedStyle(rule).marginInlineStart)).toBe(0);
  expect(px(getComputedStyle(rule).marginInlineEnd)).toBe(16);

  await rerender(<Divider inset="both" />);
  expect(px(getComputedStyle(rule).marginInlineStart)).toBe(16);
  expect(px(getComputedStyle(rule).marginInlineEnd)).toBe(16);
});

test('flips the inset in right-to-left layouts', async () => {
  await render(
    <div dir="rtl" style={{ inlineSize: 200 }}>
      <Divider inset="start" />
    </div>,
  );
  const rule = page.getByRole('separator').element();
  expect(px(getComputedStyle(rule).marginRight)).toBe(16);
  expect(px(getComputedStyle(rule).marginLeft)).toBe(0);
});
