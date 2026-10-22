import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Switch } from './switch.js';

const px = (value: string) => Number.parseFloat(value);
const track = (root: Element) => root.querySelector('span > span') as HTMLElement;
const handle = (root: Element) =>
  root.querySelector('span > span > span > span:last-child') as HTMLElement;

test('is a native checkbox exposed as a switch', async () => {
  await render(<Switch aria-label="Wi-Fi" />);
  const toggle = page.getByRole('switch', { name: 'Wi-Fi' });
  await expect.element(toggle).toBeVisible();
  expect(toggle.element().tagName).toBe('INPUT');
  expect((toggle.element() as HTMLInputElement).type).toBe('checkbox');
  await expect.element(toggle).not.toBeChecked();
});

test('toggles on click and on Space, reporting the new value', async () => {
  const onCheckedChange = vi.fn();
  await render(<Switch aria-label="Wi-Fi" onCheckedChange={onCheckedChange} />);
  const toggle = page.getByRole('switch');

  await userEvent.click(toggle);
  await expect.element(toggle).toBeChecked();
  expect(onCheckedChange).toHaveBeenLastCalledWith(true);

  (toggle.element() as HTMLElement).focus();
  await userEvent.keyboard(' ');
  await expect.element(toggle).not.toBeChecked();
  expect(onCheckedChange).toHaveBeenLastCalledWith(false);
});

test('is named and toggled by a wrapping label', async () => {
  await render(
    <label>
      <Switch /> Airplane mode
    </label>,
  );
  const toggle = page.getByRole('switch', { name: 'Airplane mode' });
  await userEvent.click(page.getByText('Airplane mode'));
  await expect.element(toggle).toBeChecked();
});

test('stays put when controlled until the parent updates it', async () => {
  const onCheckedChange = vi.fn();
  const { rerender } = await render(
    <Switch aria-label="x" checked={false} onCheckedChange={onCheckedChange} />,
  );
  const toggle = page.getByRole('switch');
  await userEvent.click(toggle);
  expect(onCheckedChange).toHaveBeenCalledWith(true);
  await expect.element(toggle).not.toBeChecked();

  await rerender(<Switch aria-label="x" checked onCheckedChange={onCheckedChange} />);
  await expect.element(toggle).toBeChecked();
});

test('does not toggle when disabled', async () => {
  const onCheckedChange = vi.fn();
  await render(<Switch aria-label="x" disabled onCheckedChange={onCheckedChange} />);
  const toggle = page.getByRole('switch');
  await expect.element(toggle).toBeDisabled();
  await userEvent.click(toggle, { force: true });
  expect(onCheckedChange).not.toHaveBeenCalled();
});

test('takes part in a form like any checkbox', async () => {
  await render(
    <form data-testid="form">
      <Switch aria-label="x" name="wifi" defaultChecked />
    </form>,
  );
  const data = new FormData(page.getByTestId('form').element() as HTMLFormElement);
  expect(data.get('wifi')).toBe('on');
});

test('has Material proportions and a 48px touch target', async () => {
  const { container } = await render(<Switch aria-label="x" />);
  const root = container.firstElementChild as HTMLElement;
  expect(root.getBoundingClientRect().width).toBe(52);
  expect(root.getBoundingClientRect().height).toBe(32);
  expect(page.getByRole('switch').element().getBoundingClientRect().height).toBe(48);
});

test('paints the Material track colours', async () => {
  const { container } = await render(<Switch aria-label="x" />);
  const root = container.firstElementChild as HTMLElement;
  // surface-container-highest, with the 2px outline.
  expect(getComputedStyle(track(root)).backgroundColor).toBe('rgb(230, 224, 233)');
  expect(px(getComputedStyle(track(root)).borderTopWidth)).toBe(2);

  await userEvent.click(page.getByRole('switch'));
  await expect.poll(() => getComputedStyle(track(root)).backgroundColor).toBe('rgb(103, 80, 164)');
});

test('grows the handle from 16px to 24px, and to 24px with icons', async () => {
  const { container, rerender } = await render(<Switch aria-label="x" />);
  const root = container.firstElementChild as HTMLElement;
  expect(handle(root).getBoundingClientRect().width).toBe(16);

  await userEvent.click(page.getByRole('switch'));
  await expect.poll(() => handle(root).getBoundingClientRect().width).toBe(24);

  await rerender(<Switch aria-label="x" icons />);
  await expect.poll(() => handle(root).getBoundingClientRect().width).toBe(24);
});

test('slides the handle to the end of the track, mirrored in right-to-left', async () => {
  const centre = (el: Element, from: Element) => {
    const rect = el.getBoundingClientRect();
    return rect.left + rect.width / 2 - from.getBoundingClientRect().left;
  };
  const { container } = await render(
    <div dir="rtl">
      <Switch aria-label="x" />
    </div>,
  );
  const root = container.querySelector('span') as HTMLElement;
  // In RTL the unselected handle sits at the right (start) edge.
  expect(centre(handle(root), root)).toBe(36);
  await userEvent.click(page.getByRole('switch'));
  await expect.poll(() => centre(handle(root), root)).toBe(16);
});

test('draws the focus ring on the track for keyboard focus', async () => {
  const { container } = await render(<Switch aria-label="x" />);
  const root = container.firstElementChild as HTMLElement;
  await userEvent.tab();
  await expect.element(page.getByRole('switch')).toHaveFocus();
  const style = getComputedStyle(track(root));
  expect(style.outlineStyle).toBe('solid');
  expect(px(style.outlineWidth)).toBe(3);
});

test('shows the press ripple on the handle', async () => {
  const { container } = await render(<Switch aria-label="x" />);
  const input = page.getByRole('switch').element();
  const surface = container.querySelector('[data-wisp-state-layer]') as HTMLElement;
  input.dispatchEvent(
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
