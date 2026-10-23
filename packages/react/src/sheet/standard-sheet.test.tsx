import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { StandardSheet, type StandardSheetProps } from './standard-sheet.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const sheet = () => document.querySelector('aside') as HTMLElement;
const closeButton = () => page.getByRole('button', { name: 'Close' });
const handle = () => page.getByRole('button', { name: 'Close sheet' }).element() as HTMLElement;

function Basic({ children, ...props }: Partial<StandardSheetProps>) {
  return (
    <StandardSheet open headline="Filters" {...props}>
      {children ?? <p>Choose what to show.</p>}
    </StandardSheet>
  );
}

/** Whether an element casts a shadow: an elevation of level 0 still computes a list of zero ones. */
const hasShadow = (el: Element) => /[1-9]\d*(?:\.\d+)?px/.test(style(el).boxShadow);

/** A sheet beside a page, as it is meant to be used. */
function Page({
  direction = 'row',
  ...props
}: Partial<StandardSheetProps> & { direction?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction as never,
        inlineSize: 800,
        blockSize: 400,
      }}
    >
      <main style={{ flex: 1, minInlineSize: 0, minBlockSize: 0 }}>
        <button type="button">On the page</button>
      </main>
      <Basic {...props} />
    </div>
  );
}

function Controlled({ side = 'end' }: { side?: StandardSheetProps['side'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: 'flex', inlineSize: 800, blockSize: 400 }}>
      <main style={{ flex: 1 }}>
        <button type="button" onClick={() => setOpen(true)}>
          Open filters
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Hide filters
        </button>
      </main>
      <StandardSheet open={open} onOpenChange={setOpen} side={side} headline="Filters">
        <input aria-label="Search filters" />
      </StandardSheet>
    </div>
  );
}

test('is a complementary landmark named by its headline', async () => {
  await render(<Basic />);
  await expect.element(page.getByRole('complementary', { name: 'Filters' })).toBeVisible();
  expect(page.getByRole('heading', { name: 'Filters', level: 2 }).element()).toBeTruthy();
});

test('can be named without a headline', async () => {
  await render(<Basic headline={undefined} aria-label="Details" />);
  await expect.element(page.getByRole('complementary', { name: 'Details' })).toBeVisible();
});

test('is not a dialog: no top layer, no scrim, and the page stays usable', async () => {
  await render(<Page />);
  expect(sheet().closest('dialog')).toBeNull();
  expect(sheet().matches(':modal')).toBe(false);
  // The page beside it is neither inert nor covered.
  const onPage = page.getByRole('button', { name: 'On the page' });
  await expect.element(onPage).toBeVisible();
  await userEvent.click(onPage);
  await expect.element(onPage).toHaveFocus();
  expect(sheet().hasAttribute('inert')).toBe(false);
});

test.describe('side', () => {
  test('takes 400px of the layout when open, beside the content', async () => {
    await render(<Page side="end" />);
    await expect.poll(() => rect(sheet()).width).toBe(400);
    expect(rect(sheet()).right).toBe(rect(sheet().parentElement as Element).right);
    // The content gives it room instead of being covered.
    expect(rect(page.getByRole('main').element()).width).toBe(400);
  });

  test('takes the width it is given, but not less than 256px', async () => {
    const { rerender } = await render(<Page side="end" width={320} />);
    await expect.poll(() => rect(sheet()).width).toBe(320);
    await rerender(<Page side="end" width={100} />);
    await expect.poll(() => rect(sheet()).width).toBe(256);
  });

  test('fills the height it is given', async () => {
    await render(<Page side="end" />);
    expect(rect(sheet()).height).toBe(400);
  });

  test('is the page colour, flat and square, and set apart by a divider on its inner edge', async () => {
    await render(<Page side="end" />);
    // `surface`, not the container colour of the modal sheet.
    expect(style(sheet()).backgroundColor).toBe('rgb(254, 247, 255)');
    expect(hasShadow(sheet())).toBe(false);
    expect(px(style(sheet()).borderTopLeftRadius)).toBe(0);
    const surface = sheet().firstElementChild as HTMLElement;
    expect(style(surface).borderInlineStartWidth).toBe('1px');
    expect(style(surface).borderInlineEndWidth).toBe('0px');
  });

  test('puts its divider on the end edge when it sits at the start', async () => {
    await render(<Page side="start" />);
    const surface = sheet().firstElementChild as HTMLElement;
    expect(style(surface).borderInlineEndWidth).toBe('1px');
    expect(style(surface).borderInlineStartWidth).toBe('0px');
  });

  test('titles itself in the title-large type', async () => {
    await render(<Page side="end" />);
    const headline = page.getByRole('heading', { name: 'Filters' }).element();
    expect(style(headline).fontSize).toBe('22px');
  });

  test('has a close button that asks to close', async () => {
    const onOpenChange = vi.fn();
    await render(<Page side="end" onOpenChange={onOpenChange} />);
    await userEvent.click(closeButton());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('can do without the close button, and name it', async () => {
    const { rerender } = await render(<Page side="end" closeButton={false} />);
    expect(
      page
        .getByRole('button')
        .elements()
        .map((el) => el.textContent),
    ).toEqual(['On the page']);
    await rerender(<Page side="end" closeLabel="Dismiss filters" />);
    await expect.element(page.getByRole('button', { name: 'Dismiss filters' })).toBeVisible();
  });

  test('shows actions at the bottom', async () => {
    await render(<Page side="end" actions={<button type="button">Apply</button>} />);
    const apply = page.getByRole('button', { name: 'Apply' }).element();
    expect(rect(apply).bottom).toBeGreaterThan(rect(sheet()).bottom - 80);
  });

  test('has no drag handle', async () => {
    await render(<Page side="end" />);
    expect(page.getByRole('button', { name: 'Close sheet' }).elements()).toHaveLength(0);
  });
});

test.describe('open and closed', () => {
  test('a closed sheet takes no room and is inert, and hidden from assistive technology', async () => {
    await render(<Page open={false} />);
    await expect.poll(() => rect(sheet()).width).toBe(0);
    expect(sheet().inert).toBe(true);
    // The content has the whole row.
    expect(rect(page.getByRole('main').element()).width).toBe(800);
  });

  test('has nothing to focus while it is closed', async () => {
    await render(<Page open={false} />);
    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'On the page' })).toHaveFocus();
    await userEvent.tab();
    expect(sheet().contains(document.activeElement)).toBe(false);
  });

  test('grows into the layout when it opens and gives the room back when it closes', async () => {
    await render(<Controlled />);
    expect(rect(sheet()).width).toBe(0);
    await userEvent.click(page.getByRole('button', { name: 'Open filters' }));
    await expect.poll(() => rect(sheet()).width).toBe(400);
    await userEvent.click(closeButton());
    await expect.poll(() => rect(sheet()).width).toBe(0);
    expect(sheet()).toHaveAttribute('inert');
  });

  test('draws no shadow or border while closed', async () => {
    await render(<Page side="bottom" direction="column" open={false} />);
    await expect.poll(() => hasShadow(sheet())).toBe(false);
  });

  test('keeps its content its full width while it opens, so nothing reflows', async () => {
    await render(<Controlled />);
    const surface = sheet().firstElementChild as HTMLElement;
    expect(rect(surface).width).toBe(400);
    await userEvent.click(page.getByRole('button', { name: 'Open filters' }));
    await expect.poll(() => rect(sheet()).width).toBe(400);
    expect(rect(surface).width).toBe(400);
  });
});

test.describe('bottom', () => {
  const bottom = (props: Partial<StandardSheetProps> = {}) => (
    <Page side="bottom" direction="column" {...props} />
  );

  test('takes the height of its content, under the content, at most 640px wide', async () => {
    await render(bottom());
    await expect.poll(() => rect(sheet()).height).toBeGreaterThan(48);
    expect(rect(sheet()).width).toBe(640);
    expect(rect(sheet()).bottom).toBe(rect(sheet().parentElement as Element).bottom);
    // The content above gives it room.
    expect(rect(page.getByRole('main').element()).height).toBe(400 - rect(sheet()).height);
  });

  test('is surface-container-low, with 28px top corners and the first level of elevation', async () => {
    await render(bottom());
    expect(style(sheet()).backgroundColor).toBe('rgb(247, 242, 250)');
    expect(px(style(sheet()).borderTopLeftRadius)).toBe(28);
    expect(px(style(sheet()).borderTopRightRadius)).toBe(28);
    expect(px(style(sheet()).borderBottomLeftRadius)).toBe(0);
    expect(hasShadow(sheet())).toBe(true);
  });

  test('draws a 32x4 handle in a 48px touch target', async () => {
    await render(bottom());
    expect(rect(handle()).height).toBe(48);
    expect(px(style(handle(), '::before').width)).toBe(32);
    expect(px(style(handle(), '::before').height)).toBe(4);
  });

  test('has the handle but no close button, and no handle when it is turned off', async () => {
    const { rerender } = await render(bottom());
    expect(page.getByRole('button', { name: 'Close sheet' }).elements()).toHaveLength(1);
    expect(page.getByRole('button', { name: 'Close', exact: true }).elements()).toHaveLength(0);
    await rerender(bottom({ dragHandle: false }));
    expect(page.getByRole('button', { name: 'Close sheet' }).elements()).toHaveLength(0);
  });

  test('a press on the handle asks to close', async () => {
    const onOpenChange = vi.fn();
    await render(bottom({ onOpenChange }));
    await userEvent.click(handle());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('the handle can be named', async () => {
    await render(bottom({ dragHandleLabel: 'Hide player' }));
    await expect.element(page.getByRole('button', { name: 'Hide player' })).toBeVisible();
  });

  test('collapses to nothing when closed', async () => {
    await render(bottom({ open: false }));
    await expect.poll(() => rect(sheet()).height).toBe(0);
    expect(rect(page.getByRole('main').element()).height).toBe(400);
  });

  test('follows a drag on the handle, and asks to close when dragged far enough', async () => {
    const onOpenChange = vi.fn();
    await render(bottom({ onOpenChange }));
    const box = rect(handle());
    const at = (y: number, type: string) =>
      handle().dispatchEvent(
        new PointerEvent(type, {
          pointerId: 3,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: box.left + box.width / 2,
          clientY: box.top + y,
          bubbles: true,
        }),
      );
    const top = rect(sheet()).top;
    at(0, 'pointerdown');
    at(30, 'pointermove');
    expect(sheet()).toHaveAttribute('data-dragging');
    expect(Math.round(rect(sheet()).top - top)).toBe(30);
    at(30, 'pointerup');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(sheet()).not.toHaveAttribute('data-dragging');
    // Short of the threshold the spring puts it back.
    await expect.poll(() => Math.round(rect(sheet()).top - top)).toBe(0);
    at(0, 'pointerdown');
    at(120, 'pointermove');
    at(120, 'pointerup');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

test.describe('keyboard and focus', () => {
  test('Escape inside the sheet asks to close', async () => {
    const onOpenChange = vi.fn();
    await render(<Page onOpenChange={onOpenChange} />);
    closeButton().element().focus();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('Escape on the page does not close it, as the sheet is not what the user is in', async () => {
    const onOpenChange = vi.fn();
    await render(<Page onOpenChange={onOpenChange} />);
    page.getByRole('button', { name: 'On the page' }).element().focus();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('leaves Escape to an open dialog inside the sheet', async () => {
    const onOpenChange = vi.fn();
    await render(
      <Basic onOpenChange={onOpenChange}>
        <dialog open aria-label="Nested">
          <button type="button">In the dialog</button>
        </dialog>
      </Basic>,
    );
    page.getByRole('button', { name: 'In the dialog' }).element().focus();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('does not take focus when it opens, since it is not modal', async () => {
    await render(<Controlled />);
    const opener = page.getByRole('button', { name: 'Open filters' });
    await userEvent.click(opener);
    await expect.poll(() => rect(sheet()).width).toBe(400);
    await expect.element(opener).toHaveFocus();
  });

  test('gives focus back to what had it when it opened, if closing took it from the sheet', async () => {
    await render(<Controlled />);
    const opener = page.getByRole('button', { name: 'Open filters' });
    await userEvent.click(opener);
    await expect.poll(() => rect(sheet()).width).toBe(400);
    closeButton().element().focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => sheet().hasAttribute('inert')).toBe(true);
    await expect.element(opener).toHaveFocus();
  });

  test('leaves focus where the user put it when the sheet closes with focus elsewhere', async () => {
    await render(<Controlled />);
    await userEvent.click(page.getByRole('button', { name: 'Open filters' }));
    await expect.poll(() => rect(sheet()).width).toBe(400);
    (page.getByRole('textbox').element() as HTMLElement).focus();
    // The user moves on to the page, which then closes the sheet.
    const hide = page.getByRole('button', { name: 'Hide filters' });
    await userEvent.click(hide);
    await expect.poll(() => sheet().hasAttribute('inert')).toBe(true);
    await expect.element(hide).toHaveFocus();
  });

  test('draws a focus ring on the handle when it is reached with the keyboard', async () => {
    await render(<Page side="bottom" direction="column" />);
    await userEvent.tab();
    await userEvent.tab();
    expect(handle()).toHaveFocus();
    expect(style(handle()).outlineStyle).toBe('solid');
    expect(px(style(handle()).outlineWidth)).toBe(3);
  });
});

test('reverses in a right-to-left layout', async () => {
  await render(
    <div dir="rtl">
      <Page side="end" />
    </div>,
  );
  await expect.poll(() => rect(sheet()).width).toBe(400);
  // The end edge is on the left.
  expect(rect(sheet()).left).toBe(rect(sheet().parentElement as Element).left);
  const surface = sheet().firstElementChild as HTMLElement;
  expect(style(surface).borderInlineStartWidth).toBe('1px');
  expect(style(surface).borderRightWidth).toBe('1px');
});

test('forwards a ref, a class and props to the element', async () => {
  let node: HTMLElement | null = null;
  await render(
    <Basic
      className="mine"
      data-testid="sheet"
      ref={(el) => {
        node = el;
      }}
    />,
  );
  expect(node).toBe(sheet());
  expect(sheet()).toHaveClass('mine');
  expect(sheet().getAttribute('data-testid')).toBe('sheet');
});
