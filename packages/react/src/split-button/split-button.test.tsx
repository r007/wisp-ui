import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { MenuItem } from '../menu/menu.js';
import { SplitButton, type SplitButtonProps } from './split-button.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const action = () => page.getByRole('button', { name: 'Save' }).element() as HTMLElement;
const chevron = () =>
  page.getByRole('button', { name: 'More save options' }).element() as HTMLElement;
// A closed menu is not rendered, so look it up by attribute.
const panel = () => document.querySelector('[role="menu"]') as HTMLElement;
const shown = () => panel().matches(':popover-open');

function Split(props: Partial<SplitButtonProps>) {
  return (
    <div style={{ padding: '24px 200px 200px' }}>
      <SplitButton
        menuLabel="More save options"
        menu={
          <>
            <MenuItem>Save as…</MenuItem>
            <MenuItem>Save a copy</MenuItem>
          </>
        }
        {...props}
      >
        Save
      </SplitButton>
    </div>
  );
}

test('is a group of an action and a menu button', async () => {
  await render(<Split />);
  expect(page.getByRole('group').element()).toContainElement(action());
  expect(chevron()).toHaveAttribute('aria-haspopup', 'menu');
  expect(chevron()).toHaveAttribute('aria-expanded', 'false');
});

test('runs the action from the main button only', async () => {
  const onClick = vi.fn();
  await render(<Split onClick={onClick} />);
  await userEvent.click(action());
  expect(onClick).toHaveBeenCalledTimes(1);
  await userEvent.click(chevron());
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('opens its menu from the chevron, and closes it when an item is chosen', async () => {
  await render(<Split />);
  await userEvent.click(chevron());
  await expect.poll(shown).toBe(true);
  expect(chevron()).toHaveAttribute('aria-expanded', 'true');
  await expect.element(page.getByRole('menuitem', { name: 'Save as…' })).toBeVisible();
  await userEvent.click(page.getByRole('menuitem', { name: 'Save a copy' }));
  await expect.poll(shown).toBe(false);
});

test('opens the menu below, aligned to the end of the whole button', async () => {
  await render(<Split />);
  await userEvent.click(chevron());
  await expect.poll(shown).toBe(true);
  await expect.poll(() => Math.round(rect(panel()).right - rect(chevron()).right)).toBe(0);
  expect(rect(panel()).top).toBeGreaterThan(rect(chevron()).bottom);
});

test('is disabled as a whole', async () => {
  await render(<Split disabled />);
  await expect.element(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'More save options' })).toBeDisabled();
});

test.describe('appearance', () => {
  test('is 40px tall, its two buttons 2px apart', async () => {
    await render(<Split />);
    expect(rect(action()).height).toBe(40);
    expect(rect(chevron()).height).toBe(40);
    expect(Math.round(rect(chevron()).left - rect(action()).right)).toBe(2);
  });

  test('pads the action 16px before and 12px after, and the chevron 13px each side of its icon', async () => {
    await render(<Split icon={<svg />} />);
    expect(px(style(action()).paddingLeft)).toBe(16);
    expect(px(style(action()).paddingRight)).toBe(12);
    // 13 + 22 + 13.
    expect(Math.round(rect(chevron()).width)).toBe(48);
    expect(Math.round(rect(chevron().querySelector('svg') as Element).width)).toBe(22);
  });

  test('draws the chevron in the colour of the button’s content, not the default black', async () => {
    const { rerender } = await render(<Split variant="filled" />);
    const glyph = () => chevron().querySelector('svg') as SVGElement;
    // `on-primary` on a filled button.
    expect(style(glyph()).fill).toBe('rgb(255, 255, 255)');
    expect(style(glyph()).fill).toBe(style(chevron()).color);
    await rerender(<Split variant="elevated" />);
    expect(style(glyph()).fill).toBe(style(chevron()).color);
    expect(style(glyph()).fill).not.toBe('rgb(0, 0, 0)');
  });

  test('rounds the outer ends fully and the touching corners to 4px', async () => {
    await render(<Split />);
    expect(px(style(action()).borderTopLeftRadius)).toBe(20);
    expect(px(style(action()).borderTopRightRadius)).toBe(4);
    expect(px(style(chevron()).borderTopLeftRadius)).toBe(4);
    expect(px(style(chevron()).borderTopRightRadius)).toBe(20);
  });

  test('opens the touching corners to 12px under the pointer', async () => {
    await render(<Split />);
    await userEvent.hover(action());
    await expect.poll(() => px(style(action()).borderTopRightRadius)).toBe(12);
    // The outer end stays round.
    expect(px(style(action()).borderTopLeftRadius)).toBe(20);
  });

  test('rounds the chevron button fully and turns the chevron while the menu is open', async () => {
    await render(<Split />);
    const icon = chevron().querySelector('svg')?.parentElement as HTMLElement;
    expect(style(icon).rotate).toBe('none');
    await userEvent.click(chevron());
    await expect.poll(() => px(style(chevron()).borderTopLeftRadius)).toBe(20);
    await expect.poll(() => style(icon).rotate).toBe('180deg');
  });

  test('takes the size: xlarge is 136px tall with a 50px chevron icon', async () => {
    await render(<Split size="xlarge" />);
    expect(rect(action()).height).toBe(136);
    expect(Math.round(rect(chevron().querySelector('svg') as Element).width)).toBe(50);
    expect(px(style(action()).borderTopLeftRadius)).toBe(68);
  });

  test('takes its variant: filled is primary, outlined has an outline', async () => {
    const { rerender } = await render(<Split />);
    expect(style(action()).backgroundColor).toBe('rgb(103, 80, 164)');
    await rerender(<Split variant="outlined" />);
    await expect.poll(() => style(action()).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style(action()).boxShadow).toContain('inset');
  });
});
