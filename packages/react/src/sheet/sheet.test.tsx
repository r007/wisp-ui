import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.js';
import { Sheet, type SheetProps } from './sheet.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
// A closed dialog is not rendered, so look it up by tag.
const sheet = () => document.querySelector('dialog') as HTMLDialogElement;
const handle = () => page.getByRole('button', { name: 'Close sheet' }).element() as HTMLElement;

function Basic(props: Partial<SheetProps>) {
  return (
    <Sheet open headline="Share" {...props}>
      <p>Choose how to share.</p>
    </Sheet>
  );
}

function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Basic open={open} onOpenChange={setOpen} />
    </>
  );
}

test('is a modal dialog named by its headline', async () => {
  await render(<Basic />);
  await expect.element(page.getByRole('dialog', { name: 'Share' })).toBeVisible();
  expect(sheet().matches(':modal')).toBe(true);
});

test('moves focus inside when opened and back to the opener when closed', async () => {
  await render(<Opener />);
  const opener = page.getByRole('button', { name: 'Open' });
  await userEvent.click(opener);
  await expect.poll(() => sheet().open).toBe(true);
  expect(sheet().contains(document.activeElement)).toBe(true);
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => sheet().open).toBe(false);
  await expect.element(opener).toHaveFocus();
});

test('asks the parent to close on Escape and on a scrim click, but not for clicks inside', async () => {
  const onOpenChange = vi.fn();
  await render(<Basic onOpenChange={onOpenChange} />);
  await userEvent.click(page.getByText('Choose how to share.'));
  expect(onOpenChange).not.toHaveBeenCalled();
  await userEvent.keyboard('{Escape}');
  expect(onOpenChange).toHaveBeenCalledWith(false);
  onOpenChange.mockClear();
  sheet().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
});

test('slides out before it closes, in every browser', async () => {
  const { rerender } = await render(<Basic />);
  await expect.poll(() => Math.round(rect(sheet()).bottom)).toBe(window.innerHeight);
  await rerender(<Basic open={false} />);
  expect(sheet().open).toBe(true);
  expect(sheet()).toHaveAttribute('data-closing');
  await expect.poll(() => sheet().open).toBe(false);
});

test.describe('bottom', () => {
  test('sits at the bottom edge, centred, at most 640px wide', async () => {
    await page.viewport(900, 700);
    await render(<Basic />);
    await expect.poll(() => Math.round(rect(sheet()).bottom)).toBe(700);
    expect(rect(sheet()).width).toBe(640);
    expect(Math.abs(rect(sheet()).left + rect(sheet()).width / 2 - 450)).toBeLessThan(1);
    await page.viewport(414, 896);
  });

  test('is a low surface with 28px top corners, square at the bottom, and a shadow', async () => {
    await render(<Basic />);
    await expect.poll(() => Math.round(rect(sheet()).bottom)).toBe(window.innerHeight);
    // surface-container-low.
    expect(style(sheet()).backgroundColor).toBe('rgb(247, 242, 250)');
    expect(px(style(sheet()).borderTopLeftRadius)).toBe(28);
    expect(px(style(sheet()).borderBottomLeftRadius)).toBe(0);
    expect(style(sheet()).boxShadow).not.toBe('none');
  });

  test('can float: detached 8px from the edge with every corner rounded', async () => {
    await render(<Basic floating />);
    await expect.poll(() => Math.round(window.innerHeight - rect(sheet()).bottom)).toBe(8);
    expect(px(style(sheet()).borderBottomLeftRadius)).toBe(28);
    expect(Math.round(rect(sheet()).left)).toBe(8);
  });

  test('has a 32x4 drag handle in a 48px touch target', async () => {
    await render(<Basic />);
    expect(rect(handle()).height).toBe(48);
    const pill = style(handle(), '::before');
    expect(px(pill.width)).toBe(32);
    expect(px(pill.height)).toBe(4);
    // on-surface-variant.
    expect(pill.backgroundColor).toBe('rgb(73, 69, 79)');
  });

  test('closes when the handle is pressed', async () => {
    const onOpenChange = vi.fn();
    await render(<Basic onOpenChange={onOpenChange} />);
    await userEvent.click(handle());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('follows a downward drag of the handle, and closes past the threshold', async () => {
    const onOpenChange = vi.fn();
    await render(<Basic onOpenChange={onOpenChange} />);
    await expect.poll(() => Math.round(rect(sheet()).bottom)).toBe(window.innerHeight);
    const box = rect(handle());
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const fire = (type: string, dy: number) =>
      handle().dispatchEvent(
        new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y + dy, bubbles: true }),
      );
    fire('pointerdown', 0);
    fire('pointermove', 20);
    expect(sheet()).toHaveAttribute('data-dragging');
    expect(px(sheet().style.getPropertyValue('--_drag'))).toBe(20);
    // Short of the threshold (the lesser of 96px and 30% of the sheet): it springs back.
    fire('pointerup', 20);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(sheet()).not.toHaveAttribute('data-dragging');

    fire('pointerdown', 0);
    fire('pointermove', 140);
    fire('pointerup', 140);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('has no handle when asked, and takes an accessible name for it', async () => {
    const { rerender } = await render(<Basic dragHandle={false} />);
    expect(page.getByRole('button', { name: 'Close sheet' }).elements()).toHaveLength(0);
    await rerender(<Basic dragHandleLabel="Dismiss" />);
    await expect.element(page.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  });

  test('puts a headline and actions around scrolling content', async () => {
    await render(
      <Basic actions={<Button variant="text">Done</Button>}>
        <div style={{ blockSize: 3000 }}>Long</div>
      </Basic>,
    );
    await expect.poll(() => Math.round(rect(sheet()).bottom)).toBe(window.innerHeight);
    expect(rect(sheet()).height).toBeLessThanOrEqual(window.innerHeight - 72);
    await expect.element(page.getByRole('button', { name: 'Done' })).toBeVisible();
  });
});

test.describe('side', () => {
  test('slides in from the end edge, 400px wide and full height', async () => {
    await page.viewport(900, 700);
    await render(<Basic side="end" />);
    await expect.poll(() => Math.round(rect(sheet()).right)).toBe(900);
    expect(rect(sheet()).width).toBe(400);
    expect(rect(sheet()).height).toBe(700);
    await page.viewport(414, 896);
  });

  test('rounds only the corners facing the page, and mirrors for the start edge', async () => {
    const { rerender } = await render(<Basic side="end" />);
    await expect.poll(() => px(style(sheet()).borderTopLeftRadius)).toBe(16);
    expect(px(style(sheet()).borderTopRightRadius)).toBe(0);
    await rerender(<Basic side="start" />);
    await expect.poll(() => px(style(sheet()).borderTopRightRadius)).toBe(16);
    expect(px(style(sheet()).borderTopLeftRadius)).toBe(0);
  });

  test('has no drag handle', async () => {
    await render(<Basic side="end" />);
    expect(page.getByRole('button', { name: 'Close sheet' }).elements()).toHaveLength(0);
  });

  test('is a title-large headline on the on-surface-variant colour', async () => {
    await render(<Basic side="end" />);
    const headline = page.getByRole('heading', { name: 'Share' }).element();
    expect(style(headline).fontSize).toBe('22px');
    expect(style(headline).color).toBe('rgb(73, 69, 79)');
  });

  test('mirrors in right-to-left layouts', async () => {
    await page.viewport(900, 700);
    await render(
      <div dir="rtl">
        <Basic side="end" />
      </div>,
    );
    // The end edge is the left one.
    await expect.poll(() => Math.round(rect(sheet()).left)).toBe(0);
    await page.viewport(414, 896);
  });
});
