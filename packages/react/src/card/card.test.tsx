import { createRef } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Card } from './card.js';

const px = (value: string) => Number.parseFloat(value);
const card = (root: Element) => root.firstElementChild as HTMLElement;
const shadow = (el: Element) => getComputedStyle(el).boxShadow;

test('is a plain container until it is clickable', async () => {
  const { container } = await render(<Card>Content</Card>);
  const el = card(container);
  expect(el.tagName).toBe('DIV');
  expect(el.textContent).toBe('Content');
  expect(el.tabIndex).toBe(-1);
  expect(el.querySelector('[data-wisp-state-layer]')).toBeNull();
  expect(el).not.toHaveAttribute('data-interactive');
});

test('paints the Material container for each variant', async () => {
  const { container, rerender } = await render(<Card variant="elevated">x</Card>);
  const el = card(container);
  // surface-container-low, with 12px corners and an elevation shadow.
  expect(getComputedStyle(el).backgroundColor).toBe('rgb(247, 242, 250)');
  expect(px(getComputedStyle(el).borderTopLeftRadius)).toBe(12);
  expect(shadow(el)).not.toBe('none');

  // The colour change is animated.
  await rerender(<Card variant="filled">x</Card>);
  await expect.poll(() => getComputedStyle(el).backgroundColor).toBe('rgb(230, 224, 233)');

  await rerender(<Card variant="outlined">x</Card>);
  // surface, with a 1px outline-variant border.
  await expect.poll(() => getComputedStyle(el).backgroundColor).toBe('rgb(254, 247, 255)');
  expect(px(getComputedStyle(el).borderTopWidth)).toBe(1);
  await expect.poll(() => getComputedStyle(el).borderTopColor).toBe('rgb(202, 196, 208)');
});

test('elevated is the default variant', async () => {
  const { container } = await render(<Card>x</Card>);
  expect(card(container)).toHaveAttribute('data-variant', 'elevated');
});

test('becomes a button with onClick, operated by click, Enter and Space', async () => {
  const onClick = vi.fn();
  await render(<Card onClick={onClick}>Open</Card>);
  const button = page.getByRole('button', { name: 'Open' });
  await expect.element(button).toBeVisible();

  await userEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);

  (button.element() as HTMLElement).focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard(' ');
  expect(onClick).toHaveBeenCalledTimes(3);
});

test('becomes a link with href and may contain blocks', async () => {
  await render(
    <Card href="/albums/1">
      <h3>Blue train</h3>
      <p>John Coltrane</p>
    </Card>,
  );
  const link = page.getByRole('link');
  expect(link.element().tagName).toBe('A');
  expect(link.element()).toHaveAttribute('href', '/albums/1');
  expect(link.element().querySelector('h3')?.textContent).toBe('Blue train');
});

test('does not respond when a clickable card is disabled', async () => {
  const onClick = vi.fn();
  await render(
    <Card onClick={onClick} disabled>
      Open
    </Card>,
  );
  await expect.element(page.getByRole('button')).toBeDisabled();
  await userEvent.click(page.getByRole('button'), { force: true });
  expect(onClick).not.toHaveBeenCalled();
});

test('fades a disabled elevated card to 38% of the surface', async () => {
  const { container } = await render(
    <Card onClick={() => {}} disabled>
      x
    </Card>,
  );
  expect(getComputedStyle(card(container)).backgroundColor).toMatch(/0\.38|38%/);
});

test('a link card that is disabled loses its href and is not focusable', async () => {
  await render(
    <Card href="/x" disabled>
      Gone
    </Card>,
  );
  const link = page.getByRole('link');
  expect(link.element()).not.toHaveAttribute('href');
  expect(link.element()).toHaveAttribute('aria-disabled', 'true');
  expect((link.element() as HTMLElement).tabIndex).toBe(-1);
});

test('lifts on hover', async () => {
  const { container } = await render(<Card onClick={() => {}}>x</Card>);
  const el = card(container);
  const rest = shadow(el);
  await userEvent.hover(el);
  // Elevated cards go from level 1 to level 2.
  await expect.poll(() => shadow(el)).not.toBe(rest);
});

test('draws the focus ring for keyboard focus', async () => {
  const { container } = await render(<Card onClick={() => {}}>x</Card>);
  await userEvent.tab();
  await expect.element(page.getByRole('button')).toHaveFocus();
  const style = getComputedStyle(card(container));
  expect(style.outlineStyle).toBe('solid');
  expect(px(style.outlineWidth)).toBe(3);
});

test('does not draw the focus ring after a click', async () => {
  const { container } = await render(<Card onClick={() => {}}>x</Card>);
  await userEvent.click(page.getByRole('button'));
  expect(getComputedStyle(card(container)).outlineStyle).toBe('none');
});

test('shows the press ripple on a clickable card', async () => {
  const { container } = await render(<Card onClick={() => {}}>x</Card>);
  const surface = container.querySelector('[data-wisp-state-layer]') as HTMLElement;
  page
    .getByRole('button')
    .element()
    .dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        buttons: 1,
        bubbles: true,
      }),
    );
  expect(surface).toHaveAttribute('data-pressed');
});

test('a dragged card lifts and darkens', async () => {
  const { container, rerender } = await render(<Card variant="filled">x</Card>);
  const el = card(container);
  const rest = shadow(el);
  await rerender(
    <Card variant="filled" dragged>
      x
    </Card>,
  );
  expect(el).toHaveAttribute('data-dragged');
  await expect.poll(() => shadow(el)).not.toBe(rest);
  expect(el.querySelector('[data-wisp-state-layer]')).not.toBeNull();
});

test('forwards its ref, class and DOM props', async () => {
  const ref = createRef<HTMLDivElement>();
  const { container } = await render(
    <Card ref={ref} className="mine" data-testid="c" aria-label="Profile">
      x
    </Card>,
  );
  expect(ref.current).toBe(card(container));
  expect(card(container)).toHaveClass('mine');
  expect(card(container)).toHaveAttribute('aria-label', 'Profile');
});

test('renders a custom element with render, keeping its handlers', async () => {
  // A router handles the click itself; without this the test page would navigate.
  const own = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
  await render(
    <Card render={<a href="/x" className="router-link" onClick={own} />} onClick={() => {}}>
      Go
    </Card>,
  );
  const link = page.getByRole('link', { name: 'Go' });
  expect(link.element()).toHaveClass('router-link');
  await userEvent.click(link);
  expect(own).toHaveBeenCalled();
});
