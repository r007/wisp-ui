import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.js';
import { Banner } from './banner.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
// A closed banner is hidden from the accessibility tree, so look it up in the DOM.
const banner = () => document.querySelector('[role="status"]') as HTMLElement;

test('is a status region with its message', async () => {
  await render(<Banner>You are offline.</Banner>);
  await expect.element(page.getByRole('status')).toHaveTextContent('You are offline.');
});

test('is a low surface with a small shadow, square corners and quiet text', async () => {
  await render(<Banner>You are offline.</Banner>);
  // surface-container-low, on-surface-variant, body-medium.
  expect(style(banner()).backgroundColor).toBe('rgb(247, 242, 250)');
  expect(style(banner()).color).toBe('rgb(73, 69, 79)');
  expect(style(banner()).fontSize).toBe('14px');
  expect(style(banner()).boxShadow).not.toBe('none');
  expect(px(style(banner()).borderTopLeftRadius)).toBe(0);
});

test('is at least 52px tall, and as tall as its text needs', async () => {
  const { rerender } = await render(
    <div style={{ inlineSize: 400 }}>
      <Banner>Short.</Banner>
    </div>,
  );
  expect(rect(banner()).height).toBeGreaterThanOrEqual(52);
  const short = rect(banner()).height;
  await rerender(
    <div style={{ inlineSize: 400 }}>
      <Banner>
        A much longer message that needs several lines to say what it has to say to the user,
        because it is explaining something important about their connection.
      </Banner>
    </div>,
  );
  expect(rect(banner()).height).toBeGreaterThan(short);
});

test('shows a 40px round icon and pads 16px from the start', async () => {
  await render(<Banner icon={<svg data-testid="i" />}>Offline.</Banner>);
  const image = page.getByTestId('i').element().parentElement as HTMLElement;
  expect(rect(image).width).toBe(40);
  expect(rect(image).height).toBe(40);
  expect(px(style(image).borderTopLeftRadius)).toBeGreaterThanOrEqual(20);
  expect(Math.round(rect(image).left - rect(banner()).left)).toBe(16);
});

test('puts its actions at the end', async () => {
  await render(
    <div style={{ inlineSize: 600 }}>
      <Banner actions={<Button variant="text">Dismiss</Button>}>Offline.</Banner>
    </div>,
  );
  const action = page.getByRole('button', { name: 'Dismiss' }).element();
  expect(Math.round(rect(banner()).right - rect(action).right)).toBe(8);
  expect(rect(action).left).toBeGreaterThan(rect(page.getByText('Offline.').element()).right);
});

test('wraps its actions below the text when there is no room', async () => {
  await render(
    <div style={{ inlineSize: 300 }}>
      <Banner
        actions={
          <>
            <Button variant="text">Dismiss</Button>
            <Button variant="text">Learn more</Button>
          </>
        }
      >
        You are offline. Changes will sync when you reconnect.
      </Banner>
    </div>,
  );
  const action = page.getByRole('button', { name: 'Dismiss' }).element();
  expect(rect(action).top).toBeGreaterThanOrEqual(
    rect(page.getByText(/You are offline/).element()).bottom - 1,
  );
});

test('folds away when closed, and is then out of the accessibility tree and tab order', async () => {
  const { rerender } = await render(
    <Banner actions={<Button variant="text">Dismiss</Button>}>Offline.</Banner>,
  );
  const open = rect(banner()).height;
  expect(open).toBeGreaterThan(0);
  await rerender(
    <Banner open={false} actions={<Button variant="text">Dismiss</Button>}>
      Offline.
    </Banner>,
  );
  await expect.poll(() => Math.round(rect(banner()).height)).toBe(0);
  expect(banner()).toHaveAttribute('aria-hidden', 'true');
  expect(banner().inert).toBe(true);
  expect(style(banner()).boxShadow).toBe('none');
  await rerender(<Banner actions={<Button variant="text">Dismiss</Button>}>Offline.</Banner>);
  await expect.poll(() => Math.round(rect(banner()).height)).toBe(Math.round(open));
});
