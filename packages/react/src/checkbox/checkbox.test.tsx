import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Checkbox } from './checkbox.js';

const px = (value: string) => Number.parseFloat(value);
const container = (root: Element) => root.querySelector('[data-slot="container"]') as HTMLElement;
const input = () => page.getByRole('checkbox').element() as HTMLInputElement;

function SelectAll() {
  const [state, setState] = useState<'some' | 'all'>('some');
  return (
    <Checkbox
      aria-label="All"
      checked={state === 'all'}
      indeterminate={state === 'some'}
      onCheckedChange={() => setState('all')}
    />
  );
}

test('is a native checkbox', async () => {
  await render(<Checkbox aria-label="Remember me" />);
  const box = page.getByRole('checkbox', { name: 'Remember me' });
  await expect.element(box).toBeVisible();
  expect(box.element().tagName).toBe('INPUT');
  expect((box.element() as HTMLInputElement).type).toBe('checkbox');
  await expect.element(box).not.toBeChecked();
});

test('toggles on click and on Space, reporting the new value', async () => {
  const onCheckedChange = vi.fn();
  await render(<Checkbox aria-label="x" onCheckedChange={onCheckedChange} />);
  const box = page.getByRole('checkbox');

  await userEvent.click(box);
  await expect.element(box).toBeChecked();
  expect(onCheckedChange).toHaveBeenLastCalledWith(true);

  input().focus();
  await userEvent.keyboard(' ');
  await expect.element(box).not.toBeChecked();
  expect(onCheckedChange).toHaveBeenLastCalledWith(false);
});

test('is named and toggled by a wrapping label', async () => {
  await render(
    <label>
      <Checkbox /> Remember me
    </label>,
  );
  const box = page.getByRole('checkbox', { name: 'Remember me' });
  await userEvent.click(page.getByText('Remember me'));
  await expect.element(box).toBeChecked();
});

test('stays put when controlled until the parent updates it', async () => {
  const onCheckedChange = vi.fn();
  const { rerender } = await render(
    <Checkbox aria-label="x" checked={false} onCheckedChange={onCheckedChange} />,
  );
  const box = page.getByRole('checkbox');
  await userEvent.click(box);
  expect(onCheckedChange).toHaveBeenCalledWith(true);
  await expect.element(box).not.toBeChecked();

  await rerender(<Checkbox aria-label="x" checked onCheckedChange={onCheckedChange} />);
  await expect.element(box).toBeChecked();
});

test('does not toggle when disabled', async () => {
  const onCheckedChange = vi.fn();
  await render(<Checkbox aria-label="x" disabled onCheckedChange={onCheckedChange} />);
  const box = page.getByRole('checkbox');
  await expect.element(box).toBeDisabled();
  await userEvent.click(box, { force: true });
  expect(onCheckedChange).not.toHaveBeenCalled();
});

test('takes part in a form like any checkbox', async () => {
  await render(
    <form data-testid="form">
      <Checkbox aria-label="x" name="remember" value="yes" defaultChecked />
    </form>,
  );
  const data = new FormData(page.getByTestId('form').element() as HTMLFormElement);
  expect(data.get('remember')).toBe('yes');
});

test('has Material proportions and a 48px touch target', async () => {
  const { container: host } = await render(<Checkbox aria-label="x" />);
  const root = host.firstElementChild as HTMLElement;
  expect(root.getBoundingClientRect().width).toBe(40);
  expect(root.getBoundingClientRect().height).toBe(40);
  expect(container(root).getBoundingClientRect().width).toBe(18);
  expect(container(root).getBoundingClientRect().height).toBe(18);
  expect(input().getBoundingClientRect().width).toBe(48);
  expect(input().getBoundingClientRect().height).toBe(48);
});

test('paints an outlined box that fills with the primary colour when checked', async () => {
  const { container: host } = await render(<Checkbox aria-label="x" />);
  const box = container(host.firstElementChild as HTMLElement);
  // on-surface-variant, 2px.
  expect(getComputedStyle(box).borderTopColor).toBe('rgb(73, 69, 79)');
  expect(px(getComputedStyle(box).borderTopWidth)).toBe(2);
  expect(getComputedStyle(box).backgroundColor).toBe('rgba(0, 0, 0, 0)');

  await userEvent.click(page.getByRole('checkbox'));
  await expect.poll(() => getComputedStyle(box).backgroundColor).toBe('rgb(103, 80, 164)');
  await expect.poll(() => px(getComputedStyle(box).borderTopWidth)).toBe(0);
});

test('draws the tick when checked and nothing when empty', async () => {
  const { container: host } = await render(<Checkbox aria-label="x" />);
  const root = host.firstElementChild as HTMLElement;
  const [check] = root.querySelectorAll('path') as NodeListOf<SVGPathElement>;
  const visible = () => px(getComputedStyle(check as SVGPathElement).opacity);
  expect(visible()).toBe(0);
  await userEvent.click(page.getByRole('checkbox'));
  await expect.poll(visible).toBe(1);
  await expect.poll(() => px(getComputedStyle(check as SVGPathElement).strokeDashoffset)).toBe(0);
});

test('shows the mixed state and keeps it until the parent changes it', async () => {
  const onCheckedChange = vi.fn();
  await render(<Checkbox aria-label="All" indeterminate onCheckedChange={onCheckedChange} />);
  const box = page.getByRole('checkbox');
  await expect.element(box).toBePartiallyChecked();
  expect(input().indeterminate).toBe(true);

  await userEvent.click(box);
  expect(onCheckedChange).toHaveBeenCalledTimes(1);
  // Controlled: the parent did not clear it, so it is still mixed.
  expect(input().indeterminate).toBe(true);
});

test('leaves the mixed state when the parent clears it', async () => {
  await render(<SelectAll />);
  await userEvent.click(page.getByRole('checkbox'));
  await expect.element(page.getByRole('checkbox')).toBeChecked();
  expect(input().indeterminate).toBe(false);
});

test('draws the dash for a mixed box instead of the tick', async () => {
  const { container: host } = await render(<Checkbox aria-label="x" indeterminate />);
  const [check, dash] = (host.firstElementChild as HTMLElement).querySelectorAll('path');
  await expect.poll(() => px(getComputedStyle(dash as SVGPathElement).opacity)).toBe(1);
  expect(px(getComputedStyle(check as SVGPathElement).opacity)).toBe(0);
  await expect
    .poll(() => getComputedStyle(container(host.firstElementChild as HTMLElement)).backgroundColor)
    .toBe('rgb(103, 80, 164)');
});

test('marks an invalid checkbox and paints it with the error colour', async () => {
  const { container: host } = await render(<Checkbox aria-label="x" error />);
  await expect.element(page.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  const box = container(host.firstElementChild as HTMLElement);
  expect(getComputedStyle(box).borderTopColor).toBe('rgb(179, 38, 30)');
  await userEvent.click(page.getByRole('checkbox'));
  await expect.poll(() => getComputedStyle(box).backgroundColor).toBe('rgb(179, 38, 30)');
});

test('fades a disabled checkbox', async () => {
  const { container: host } = await render(<Checkbox aria-label="x" disabled defaultChecked />);
  const box = container(host.firstElementChild as HTMLElement);
  // on-surface at 38%: whatever colour syntax the browser serialises, the alpha is .38.
  expect(getComputedStyle(box).backgroundColor).toMatch(/0\.38|38%/);
});

test('draws the focus ring around the box for keyboard focus', async () => {
  const { container: host } = await render(<Checkbox aria-label="x" />);
  await userEvent.tab();
  await expect.element(page.getByRole('checkbox')).toHaveFocus();
  const style = getComputedStyle(container(host.firstElementChild as HTMLElement));
  expect(style.outlineStyle).toBe('solid');
  expect(px(style.outlineWidth)).toBe(3);
});

test('shows the press ripple, tinted opposite to hover', async () => {
  const { container: host } = await render(<Checkbox aria-label="x" />);
  const surface = host.querySelector('[data-wisp-state-layer]') as HTMLElement;
  const hoverColor = getComputedStyle(surface).getPropertyValue('--_state-layer-color');
  input().dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      buttons: 1,
      bubbles: true,
    }),
  );
  expect(surface).toHaveAttribute('data-pressed');
  expect(getComputedStyle(surface).getPropertyValue('--_state-layer-color')).not.toBe(hoverColor);
});
