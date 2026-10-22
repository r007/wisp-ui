import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.js';
import { Dialog, type DialogProps } from './dialog.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
// A closed dialog is not rendered, but tests still need to read its `open` state.
const dialog = () =>
  page.getByRole('dialog', { includeHidden: true }).element() as HTMLDialogElement;
const surface = () => dialog().firstElementChild as HTMLElement;

function Basic({ children = 'Your changes will be lost.', ...props }: Partial<DialogProps>) {
  return (
    <Dialog
      open
      headline="Discard draft?"
      actions={
        <>
          <Button variant="text">Cancel</Button>
          <Button variant="text">Discard</Button>
        </>
      }
      {...props}
    >
      {children}
    </Dialog>
  );
}

const Full = (props: Partial<DialogProps>) => (
  <Dialog
    open
    variant="fullscreen"
    headline="New event"
    navigation={<button type="button" aria-label="Close" />}
    actions={<Button variant="text">Save</Button>}
    {...props}
  >
    <div style={{ blockSize: 3000 }}>Form</div>
  </Dialog>
);

function OpenerApp() {
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

test('is a modal dialog named by its headline and described by its content', async () => {
  await render(<Basic />);
  const el = page.getByRole('dialog', { name: 'Discard draft?' });
  await expect.element(el).toBeVisible();
  await expect.element(el).toHaveAccessibleDescription('Your changes will be lost.');
  expect(dialog().tagName).toBe('DIALOG');
  expect(dialog().matches(':modal')).toBe(true);
});

test('is not rendered while closed', async () => {
  await render(<Basic open={false} />);
  expect(dialog().open).toBe(false);
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
});

test('can be an alert dialog', async () => {
  await render(<Basic role="alertdialog" />);
  await expect.element(page.getByRole('alertdialog', { name: 'Discard draft?' })).toBeVisible();
});

test('takes its name from aria-label when there is no headline', async () => {
  await render(
    <Dialog open aria-label="Colour picker">
      Pick one
    </Dialog>,
  );
  await expect.element(page.getByRole('dialog', { name: 'Colour picker' })).toBeVisible();
});

test('moves focus inside when opened and back to the opener when closed', async () => {
  await render(<OpenerApp />);
  const opener = page.getByRole('button', { name: 'Open' });
  await userEvent.click(opener);
  await expect.poll(() => dialog().open).toBe(true);
  expect(dialog().contains(document.activeElement)).toBe(true);

  await userEvent.keyboard('{Escape}');
  await expect.poll(() => dialog().open).toBe(false);
  await expect.element(opener).toHaveFocus();
});

test('asks the parent to close on Escape, and stays open if it declines', async () => {
  const onOpenChange = vi.fn();
  await render(<Basic onOpenChange={onOpenChange} />);
  await userEvent.keyboard('{Escape}');
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(dialog().open).toBe(true);
});

test('asks the parent to close when the scrim is clicked, but not for clicks inside', async () => {
  const onOpenChange = vi.fn();
  await render(<Basic onOpenChange={onOpenChange} />);
  await userEvent.click(page.getByRole('heading', { name: 'Discard draft?' }));
  expect(onOpenChange).not.toHaveBeenCalled();

  // A click on the scrim targets the dialog itself.
  dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
});

test('does not treat a drag that ends on the scrim as a dismissal', async () => {
  const onOpenChange = vi.fn();
  await render(<Basic onOpenChange={onOpenChange} />);
  // The press began on the headline, so the click that follows is a selection drag.
  page
    .getByRole('heading', { name: 'Discard draft?' })
    .element()
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(onOpenChange).not.toHaveBeenCalled();
});

test('tells the parent when the platform closes it, e.g. a method=dialog form', async () => {
  const onOpenChange = vi.fn();
  await render(
    <Dialog open headline="Sure?" onOpenChange={onOpenChange}>
      <form method="dialog">
        <button type="submit">Yes</button>
      </form>
    </Dialog>,
  );
  await userEvent.click(page.getByRole('button', { name: 'Yes' }));
  await expect.poll(() => onOpenChange).toHaveBeenCalledWith(false);
});

test('animates out before closing, in every browser', async () => {
  const { rerender } = await render(<Basic />);
  await expect.poll(() => getComputedStyle(dialog()).opacity).toBe('1');

  await rerender(<Basic open={false} />);
  expect(dialog().open).toBe(true);
  expect(dialog()).toHaveAttribute('data-closing');
  await expect.poll(() => dialog().open).toBe(false);
  expect(dialog()).not.toHaveAttribute('data-closing');
});

test('can be reopened while it is closing', async () => {
  const { rerender } = await render(<Basic />);
  await expect.poll(() => getComputedStyle(dialog()).opacity).toBe('1');
  await rerender(<Basic open={false} />);
  await rerender(<Basic open />);
  await expect.poll(() => getComputedStyle(dialog()).opacity).toBe('1');
  expect(dialog().open).toBe(true);
  expect(dialog()).not.toHaveAttribute('data-closing');
});

test('dims the page with the scrim at 32% and stops it scrolling', async () => {
  await render(<Basic />);
  await expect.poll(() => dialog().open).toBe(true);
  expect(getComputedStyle(dialog(), '::backdrop').backgroundColor).toMatch(
    /0[, ]+0[, ]+0\s*[,/]\s*0\.32/,
  );
  expect(getComputedStyle(document.documentElement).overflow).toBe('hidden');
});

test('has the Material container: surface-container-high, 28px corners, 24px padding', async () => {
  await render(<Basic />);
  await expect.poll(() => getComputedStyle(dialog()).opacity).toBe('1');
  const style = getComputedStyle(surface());
  expect(style.backgroundColor).toBe('rgb(236, 230, 240)');
  expect(px(style.borderTopLeftRadius)).toBe(28);
  expect(px(style.paddingLeft)).toBe(24);
  expect(style.boxShadow).not.toBe('none');
});

test('does not leak its container colour or shadow into nested text buttons', async () => {
  await render(<Basic />);
  await expect.poll(() => getComputedStyle(dialog()).opacity).toBe('1');
  const cancel = getComputedStyle(page.getByRole('button', { name: 'Cancel' }).element());
  expect(cancel.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(cancel.boxShadow).toBe('none');
});

test('is centred and between 280px and 560px wide', async () => {
  await render(<Basic />);
  await expect.poll(() => getComputedStyle(dialog()).scale).toBe('1');
  const box = rect(surface());
  expect(box.width).toBeGreaterThanOrEqual(280);
  expect(box.width).toBeLessThanOrEqual(560);
  expect(Math.abs(box.left + box.width / 2 - window.innerWidth / 2)).toBeLessThan(1);
  expect(Math.abs(box.top + box.height / 2 - window.innerHeight / 2)).toBeLessThan(1);
});

test('right-aligns its actions at the end of the surface', async () => {
  await render(<Basic />);
  await expect.poll(() => getComputedStyle(dialog()).scale).toBe('1');
  const last = rect(page.getByRole('button', { name: 'Discard' }).element());
  expect(Math.abs(last.right - (rect(surface()).right - 24))).toBeLessThan(1);
});

test('centres the headline under an icon', async () => {
  await render(<Basic icon={<svg data-testid="icon" />} />);
  expect(getComputedStyle(page.getByRole('heading').element()).textAlign).toBe('center');
  expect(rect(page.getByTestId('icon').element()).width).toBe(24);
});

test('scrolls long content instead of growing past the window', async () => {
  await render(
    <Basic>
      <div style={{ blockSize: 3000 }}>Long</div>
    </Basic>,
  );
  await expect.poll(() => getComputedStyle(dialog()).scale).toBe('1');
  expect(rect(surface()).height).toBeLessThanOrEqual(window.innerHeight - 48);
  const body = dialog().querySelector('[id]:not(h2)') as HTMLElement;
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
});

test.describe('full-screen', () => {
  test('fills the window with a 56px header', async () => {
    await render(<Full />);
    await expect.poll(() => rect(surface()).top).toBe(0);
    expect(rect(surface()).width).toBe(window.innerWidth);
    expect(rect(surface()).height).toBe(window.innerHeight);
    expect(rect(dialog().querySelector('header') as HTMLElement).height).toBe(56);
    expect(px(getComputedStyle(surface()).borderTopLeftRadius)).toBe(0);
  });

  test('puts the navigation control first and the actions last in the header', async () => {
    await render(<Full />);
    const header = dialog().querySelector('header') as HTMLElement;
    const close = rect(page.getByRole('button', { name: 'Close' }).element());
    const save = rect(page.getByRole('button', { name: 'Save' }).element());
    expect(close.left).toBeLessThan(rect(page.getByRole('heading').element()).left);
    expect(save.right).toBeLessThanOrEqual(rect(header).right - 16 + 1);
  });

  test('lifts the header once the content scrolls under it', async () => {
    await render(<Full />);
    await expect.poll(() => rect(surface()).top).toBe(0);
    const header = dialog().querySelector('header') as HTMLElement;
    const body = dialog().querySelector('[id]:not(h2)') as HTMLElement;
    const rest = getComputedStyle(header).backgroundColor;
    expect(surface()).not.toHaveAttribute('data-scrolled');

    body.scrollTop = 100;
    await expect.poll(() => surface().hasAttribute('data-scrolled')).toBe(true);
    // surface-container replaces surface.
    await expect.poll(() => getComputedStyle(header).backgroundColor).not.toBe(rest);

    body.scrollTop = 0;
    await expect.poll(() => surface().hasAttribute('data-scrolled')).toBe(false);
  });
});
