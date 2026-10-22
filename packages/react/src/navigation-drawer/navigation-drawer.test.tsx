import { type ReactNode, useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  NavigationDrawer,
  NavigationDrawerDivider,
  NavigationDrawerItem,
  type NavigationDrawerProps,
  NavigationDrawerSection,
} from './navigation-drawer.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const item = (name: string) => page.getByRole('button', { name });

function Drawer(props: Partial<NavigationDrawerProps> & { children?: ReactNode }) {
  return (
    <NavigationDrawer aria-label="Main" defaultValue="inbox" {...props}>
      {props.children ?? (
        <>
          <NavigationDrawerSection headline="Mail">
            <NavigationDrawerItem value="inbox" label="Inbox" icon={<svg />} badge="24" />
            <NavigationDrawerItem value="outbox" label="Outbox" icon={<svg />} />
          </NavigationDrawerSection>
          <NavigationDrawerDivider />
          <NavigationDrawerSection>
            <NavigationDrawerItem value="settings" label="Settings" icon={<svg />} />
          </NavigationDrawerSection>
        </>
      )}
    </NavigationDrawer>
  );
}

function OpenerApp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Menu
      </button>
      <Drawer variant="modal" open={open} onOpenChange={setOpen} />
    </>
  );
}

// A closed dialog is not rendered, but tests still need to read its `open` state.
const dialog = () =>
  page.getByRole('dialog', { name: 'Main', includeHidden: true }).element() as HTMLDialogElement;

test.describe('standard', () => {
  test('is a named navigation landmark with titled groups of destinations', async () => {
    await render(<Drawer />);
    await expect.element(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect.element(page.getByRole('list', { name: 'Mail' })).toBeVisible();
    expect(page.getByRole('separator').elements()).toHaveLength(1);
  });

  test('marks the current destination, and not as pressed', async () => {
    await render(<Drawer defaultValue="outbox" />);
    await expect.element(item('Outbox')).toHaveAttribute('aria-current', 'page');
    await expect.element(item('Inbox 24')).not.toHaveAttribute('aria-current');
    await expect.element(item('Outbox')).not.toHaveAttribute('aria-pressed');
  });

  test('selects on click and reports the value', async () => {
    const onValueChange = vi.fn();
    await render(<Drawer onValueChange={onValueChange} />);
    await userEvent.click(item('Outbox'));
    await expect.element(item('Outbox')).toHaveAttribute('aria-current', 'page');
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('outbox');
  });

  test('has Material geometry: 360px wide, 56px pills inset by 12px', async () => {
    await render(<Drawer />);
    const nav = page.getByRole('navigation').element();
    expect(rect(nav).width).toBe(360);
    const pill = rect(item('Outbox').element());
    expect(pill.height).toBe(56);
    expect(pill.width).toBe(336);
    expect(pill.left - rect(nav).left).toBe(12);
  });

  test('paints the standard surface with rounded end corners', async () => {
    await render(<Drawer />);
    const style = getComputedStyle(page.getByRole('navigation').element());
    expect(style.backgroundColor).toBe('rgb(254, 247, 255)');
    expect(px(style.borderTopRightRadius)).toBe(16);
    expect(px(style.borderTopLeftRadius)).toBe(0);
  });

  test('colours the selected pill and its content', async () => {
    await render(<Drawer defaultValue="inbox" />);
    // on-secondary-container for the selected item, on-surface-variant for the rest.
    expect(getComputedStyle(item('Inbox 24').element()).color).toBe('rgb(74, 68, 88)');
    expect(getComputedStyle(item('Outbox').element()).color).toBe('rgb(73, 69, 79)');
    const fill = (name: string) => getComputedStyle(item(name).element(), '::before');
    expect(fill('Inbox 24').backgroundColor).toBe('rgb(232, 222, 248)');
    await expect.poll(() => fill('Inbox 24').opacity).toBe('1');
    expect(fill('Outbox').opacity).toBe('0');
  });

  test('darkens an unselected item on hover and tints its state layer', async () => {
    await render(<Drawer />);
    await userEvent.hover(item('Outbox'));
    // on-surface
    await expect
      .poll(() => getComputedStyle(item('Outbox').element()).color)
      .toBe('rgb(29, 27, 32)');
    const layer = item('Outbox').element().querySelector('[data-wisp-state-layer]') as HTMLElement;
    await expect.poll(() => getComputedStyle(layer, '::before').opacity).toBe('0.08');
  });

  test('draws the focus ring inside the pill', async () => {
    await render(<Drawer />);
    await userEvent.tab();
    const style = getComputedStyle(page.getByRole('button').first().element());
    expect(style.outlineStyle).toBe('solid');
    expect(px(style.outlineOffset)).toBe(-3);
  });

  test('renders a trailing count', async () => {
    await render(<Drawer />);
    await expect.element(page.getByText('24')).toBeVisible();
  });

  test('throws a helpful error when an item is used outside a drawer', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<NavigationDrawerItem value="x" label="x" />)).rejects.toThrow(
      /inside a <NavigationDrawer>/,
    );
    error.mockRestore();
  });
});

test.describe('modal', () => {
  test('is a native dialog, closed until `open`', async () => {
    const { rerender } = await render(<Drawer variant="modal" open={false} />);
    const element = page
      .getByRole('dialog', { name: 'Main', includeHidden: true })
      .element() as HTMLDialogElement;
    expect(element.open).toBe(false);

    await rerender(<Drawer variant="modal" open />);
    await expect.poll(() => element.open).toBe(true);
    // showModal() puts it in the top layer and makes the rest of the page inert.
    expect(element.matches(':modal')).toBe(true);
  });

  test('asks the parent to close on Escape, and stays open if it declines', async () => {
    const onOpenChange = vi.fn();
    await render(<Drawer variant="modal" open onOpenChange={onOpenChange} />);
    await expect.poll(() => dialog().open).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Controlled: the parent did not change `open`, so it is still shown.
    expect(dialog().open).toBe(true);
  });

  test('asks the parent to close when the scrim is clicked, but not for clicks inside', async () => {
    const onOpenChange = vi.fn();
    await render(<Drawer variant="modal" open onOpenChange={onOpenChange} />);
    await expect.poll(() => dialog().open).toBe(true);

    await userEvent.click(page.getByRole('heading', { name: 'Mail' }));
    expect(onOpenChange).not.toHaveBeenCalled();

    // A click on the backdrop targets the dialog itself.
    dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  test('closes after a destination is chosen, unless told not to', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = await render(<Drawer variant="modal" open onOpenChange={onOpenChange} />);
    await expect.poll(() => dialog().open).toBe(true);
    await userEvent.click(item('Outbox'));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    await rerender(
      <Drawer variant="modal" open closeOnSelect={false} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(item('Settings'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('moves focus inside when opened and back to the opener when closed', async () => {
    await render(<OpenerApp />);
    const opener = page.getByRole('button', { name: 'Menu' });
    await userEvent.click(opener);
    await expect.poll(() => dialog().open).toBe(true);
    expect(dialog().contains(document.activeElement)).toBe(true);

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => dialog().open).toBe(false);
    await expect.element(opener).toHaveFocus();
  });

  test('slides out before closing, in every browser', async () => {
    const { rerender } = await render(<Drawer variant="modal" open />);
    await expect.poll(() => rect(dialog()).left).toBe(0);

    await rerender(<Drawer variant="modal" open={false} />);
    // Still on screen, heading for the edge, until the animation has finished.
    expect(dialog().open).toBe(true);
    expect(dialog()).toHaveAttribute('data-closing');
    await expect.poll(() => rect(dialog()).left).toBeLessThan(0);
    await expect.poll(() => dialog().open).toBe(false);
    expect(dialog()).not.toHaveAttribute('data-closing');
  });

  test('dims the page with the scrim at 32%', async () => {
    await render(<Drawer variant="modal" open />);
    await expect.poll(() => dialog().open).toBe(true);
    // The browser may serialise the mixed colour as rgba() or color(srgb …).
    expect(getComputedStyle(dialog(), '::backdrop').backgroundColor).toMatch(
      /0[, ]+0[, ]+0\s*[,/]\s*0\.32/,
    );
  });

  test('slides in to the start edge, leaving a 56px gap on narrow windows', async () => {
    await render(<Drawer variant="modal" open />);
    await expect.poll(() => rect(dialog()).left).toBe(0);
    expect(rect(dialog()).width).toBe(Math.min(360, window.innerWidth - 56));
    expect(rect(dialog()).height).toBe(window.innerHeight);
  });

  test('uses the modal surface and rounds the end corners', async () => {
    await render(<Drawer variant="modal" open />);
    await expect.poll(() => dialog().open).toBe(true);
    const style = getComputedStyle(dialog());
    // surface-container-low
    expect(style.backgroundColor).toBe('rgb(247, 242, 250)');
    expect(px(style.borderTopRightRadius)).toBe(16);
  });

  test('mirrors to the right edge in right-to-left', async () => {
    document.documentElement.dir = 'rtl';
    try {
      await render(<Drawer variant="modal" open />);
      await expect.poll(() => rect(dialog()).right).toBeCloseTo(window.innerWidth, 0);
    } finally {
      document.documentElement.dir = '';
    }
  });

  test('stops the page behind from scrolling while open', async () => {
    const { rerender } = await render(<Drawer variant="modal" open />);
    await expect.poll(() => getComputedStyle(document.documentElement).overflow).toBe('hidden');
    await rerender(<Drawer variant="modal" open={false} />);
    await expect.poll(() => getComputedStyle(document.documentElement).overflow).not.toBe('hidden');
  });
});
