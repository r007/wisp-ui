import { useRef } from 'react';
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TopAppBar } from './app-bar.js';

const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const bar = () => page.getByRole('banner').element() as HTMLElement;
const heading = () => page.getByRole('heading', { level: 1 });
const nav = <button type="button" aria-label="Menu" />;
const action = <button type="button" aria-label="Search" />;

function Scrolling() {
  const target = useRef<HTMLDivElement>(null);
  return (
    <div ref={target} data-testid="scroller" style={{ blockSize: 200, overflow: 'auto' }}>
      <TopAppBar title="Inbox" scrollTarget={target} sticky />
      <div style={{ blockSize: 1000 }} />
    </div>
  );
}

test('is a banner with the title as the page’s only heading', async () => {
  await render(<TopAppBar title="Inbox" />);
  await expect.element(page.getByRole('banner')).toBeVisible();
  await expect.element(heading()).toHaveTextContent('Inbox');
  expect(heading().elements()).toHaveLength(1);
});

test('keeps one heading whichever variant or state, hiding the other copy', async () => {
  const { rerender } = await render(<TopAppBar title="Inbox" variant="medium" />);
  expect(heading().elements()).toHaveLength(1);
  await rerender(<TopAppBar title="Inbox" variant="medium" collapsed />);
  expect(heading().elements()).toHaveLength(1);
  await expect.element(heading()).toBeVisible();
});

test.describe('small', () => {
  test('is a 64px surface row with the title in the row', async () => {
    await render(<TopAppBar title="Inbox" />);
    expect(rect(bar()).height).toBe(64);
    // surface, with the title in on-surface and title-large.
    expect(style(bar()).backgroundColor).toBe('rgb(254, 247, 255)');
    expect(style(heading().element()).color).toBe('rgb(29, 27, 32)');
    expect(style(heading().element()).fontSize).toBe('22px');
  });

  test('puts the navigation control 4px from the start and the actions 4px from the end', async () => {
    await render(<TopAppBar title="Inbox" navigation={nav} actions={action} />);
    const menu = page.getByRole('button', { name: 'Menu' }).element();
    const search = page.getByRole('button', { name: 'Search' }).element();
    expect(Math.round(rect(menu).left - rect(bar()).left)).toBe(4);
    expect(Math.round(rect(bar()).right - rect(search).right)).toBe(4);
    expect(rect(heading().element()).left).toBeGreaterThan(rect(menu).right);
    expect(rect(heading().element()).right).toBeLessThan(rect(search).left);
  });

  test('shows a subtitle under the title in on-surface-variant', async () => {
    await render(<TopAppBar title="Inbox" subtitle="24 unread" />);
    const subtitle = page.getByText('24 unread').element();
    expect(rect(subtitle).top).toBeGreaterThanOrEqual(rect(heading().element()).bottom - 1);
    expect(style(subtitle).color).toBe('rgb(73, 69, 79)');
    // label-medium.
    expect(style(subtitle).fontSize).toBe('12px');
    expect(rect(bar()).height).toBe(64);
  });

  test('truncates a long title instead of pushing the actions off', async () => {
    await render(
      <div style={{ inlineSize: 240 }}>
        <TopAppBar
          title="A very long title that cannot possibly fit"
          navigation={nav}
          actions={action}
        />
      </div>,
    );
    expect(rect(heading().element()).right).toBeLessThan(
      rect(page.getByRole('button', { name: 'Search' }).element()).left,
    );
  });
});

test.describe('medium and large', () => {
  test.for<['medium' | 'large', number, number, string]>([
    ['medium', 112, 136, '28px'],
    ['large', 120, 152, '36px'],
  ])(
    '%s is %ipx tall, %ipx with a subtitle, with a %s title',
    async ([variant, height, withSubtitle, size]) => {
      const { rerender } = await render(<TopAppBar title="Inbox" variant={variant} />);
      expect(rect(bar()).height).toBe(height);
      expect(style(heading().element()).fontSize).toBe(size);
      await rerender(<TopAppBar title="Inbox" variant={variant} subtitle="24 unread" />);
      expect(rect(bar()).height).toBe(withSubtitle);
    },
  );

  test('puts the title under the navigation row, at the bottom', async () => {
    await render(<TopAppBar title="Inbox" variant="medium" navigation={nav} />);
    expect(rect(heading().element()).top).toBeGreaterThanOrEqual(
      rect(page.getByRole('button', { name: 'Menu' }).element()).bottom,
    );
    expect(Math.round(rect(heading().element()).left - rect(bar()).left)).toBe(16);
  });

  test('folds into a 64px row with the title up in it when collapsed', async () => {
    const { rerender } = await render(
      <TopAppBar title="Inbox" variant="large" navigation={nav} actions={action} />,
    );
    expect(rect(bar()).height).toBe(120);
    await rerender(
      <TopAppBar title="Inbox" variant="large" navigation={nav} actions={action} collapsed />,
    );
    await expect.poll(() => Math.round(rect(bar()).height)).toBe(64);
    // The title is the small one, in the row beside the controls.
    expect(style(heading().element()).fontSize).toBe('22px');
    expect(rect(heading().element()).left).toBeGreaterThan(
      rect(page.getByRole('button', { name: 'Menu' }).element()).right,
    );
  });
});

test.describe('scrolling', () => {
  test('lifts onto a tinted surface with a shadow once scrolled', async () => {
    await render(<TopAppBar title="Inbox" scrolled />);
    // surface-container.
    await expect.poll(() => style(bar()).backgroundColor).toBe('rgb(243, 237, 247)');
    expect(style(bar()).boxShadow).not.toBe('none');
  });

  test('has no shadow at rest', async () => {
    await render(<TopAppBar title="Inbox" />);
    expect(style(bar()).boxShadow).toContain('0px 0px 0px 0px');
  });

  test('collapses a large bar when scrolled, unless told otherwise', async () => {
    const { rerender } = await render(<TopAppBar title="Inbox" variant="large" scrolled />);
    await expect.poll(() => Math.round(rect(bar()).height)).toBe(64);
    await rerender(<TopAppBar title="Inbox" variant="large" scrolled collapsed={false} />);
    await expect.poll(() => Math.round(rect(bar()).height)).toBe(120);
  });

  test('follows the scroll of a target element', async () => {
    await render(<Scrolling />);
    expect(bar()).not.toHaveAttribute('data-scrolled');
    (page.getByTestId('scroller').element() as HTMLElement).scrollTop = 80;
    await expect.poll(() => bar().hasAttribute('data-scrolled')).toBe(true);
    // Sticky: it stayed at the top of the scroller.
    expect(Math.round(rect(bar()).top)).toBe(
      Math.round(rect(page.getByTestId('scroller').element()).top),
    );
  });
});
