import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Fab, type FabVariant } from './fab.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const button = (name = 'Add') => page.getByRole('button', { name }).element() as HTMLElement;
const icon = <svg data-testid="icon" />;
const iconSlot = (el: Element) => el.querySelector('svg')?.parentElement as HTMLElement;

test('is a button named by aria-label, and clicks and presses like one', async () => {
  const onClick = vi.fn();
  await render(<Fab aria-label="Add" icon={icon} onClick={onClick} />);
  await expect.element(page.getByRole('button', { name: 'Add' })).toBeVisible();
  await userEvent.click(button());
  button().focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard(' ');
  expect(onClick).toHaveBeenCalledTimes(3);
});

test('is a link with href, and takes a custom element with render', async () => {
  const own = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
  await render(
    <>
      <Fab aria-label="Home" icon={icon} href="/home" />
      <Fab
        aria-label="Router"
        icon={icon}
        render={<a href="/x" className="router-link" onClick={own} />}
      />
    </>,
  );
  expect(page.getByRole('link', { name: 'Home' }).element()).toHaveAttribute('href', '/home');
  await userEvent.click(page.getByRole('link', { name: 'Router' }));
  expect(own).toHaveBeenCalled();
});

test.describe('icon-only', () => {
  test('is 56px square with 16px corners, a 24px icon and a level-3 shadow', async () => {
    await render(<Fab aria-label="Add" icon={icon} />);
    expect(rect(button()).width).toBe(56);
    expect(rect(button()).height).toBe(56);
    expect(px(style(button()).borderTopLeftRadius)).toBe(16);
    expect(rect(iconSlot(button())).width).toBe(24);
    expect(style(button()).boxShadow).not.toBe('none');
  });

  test('paints primary-container with an on-primary-container icon by default', async () => {
    await render(<Fab aria-label="Add" icon={icon} />);
    expect(style(button()).backgroundColor).toBe('rgb(234, 221, 255)');
    expect(style(iconSlot(button())).color).toBe('rgb(79, 55, 139)');
  });

  test('sizes small, medium and large', async () => {
    await render(
      <>
        <Fab aria-label="S" size="small" icon={icon} />
        <Fab aria-label="M" size="medium" icon={icon} />
        <Fab aria-label="L" size="large" icon={icon} />
      </>,
    );
    const small = button('S');
    const medium = button('M');
    const large = button('L');
    expect([
      rect(small).width,
      px(style(small).borderTopLeftRadius),
      rect(iconSlot(small)).width,
    ]).toEqual([40, 12, 24]);
    expect([
      rect(medium).width,
      px(style(medium).borderTopLeftRadius),
      rect(iconSlot(medium)).width,
    ]).toEqual([80, 20, 28]);
    expect([
      rect(large).width,
      px(style(large).borderTopLeftRadius),
      rect(iconSlot(large)).width,
    ]).toEqual([96, 28, 36]);
  });

  test('keeps a 48px touch target on the small size', async () => {
    await render(
      <div style={{ padding: 24 }}>
        <Fab aria-label="S" size="small" icon={icon} />
      </div>,
    );
    const box = rect(button('S'));
    expect(document.elementFromPoint(box.left - 3, box.top + box.height / 2)).toBe(button('S'));
    expect(document.elementFromPoint(box.left - 6, box.top + box.height / 2)).not.toBe(button('S'));
  });

  test.for<[FabVariant, string, string]>([
    ['primary-container', 'rgb(234, 221, 255)', 'rgb(79, 55, 139)'],
    ['secondary-container', 'rgb(232, 222, 248)', 'rgb(74, 68, 88)'],
    ['tertiary-container', 'rgb(255, 216, 228)', 'rgb(99, 59, 72)'],
    ['primary', 'rgb(103, 80, 164)', 'rgb(255, 255, 255)'],
    ['secondary', 'rgb(98, 91, 113)', 'rgb(255, 255, 255)'],
    ['tertiary', 'rgb(125, 82, 96)', 'rgb(255, 255, 255)'],
    ['surface', 'rgb(236, 230, 240)', 'rgb(103, 80, 164)'],
  ])('paints the %s colours', async ([variant, container, iconColor]) => {
    await render(<Fab aria-label="Add" variant={variant} icon={icon} />);
    expect(style(button()).backgroundColor).toBe(container);
    expect(style(iconSlot(button())).color).toBe(iconColor);
  });

  test('lowers a surface FAB: a lighter container and a smaller shadow', async () => {
    const { rerender } = await render(<Fab aria-label="Add" variant="surface" icon={icon} />);
    const raised = style(button()).boxShadow;
    await rerender(<Fab aria-label="Add" variant="surface" lowered icon={icon} />);
    await expect.poll(() => style(button()).backgroundColor).toBe('rgb(247, 242, 250)');
    expect(style(button()).boxShadow).not.toBe(raised);
  });

  test('lifts on hover', async () => {
    await render(<Fab aria-label="Add" icon={icon} />);
    const rest = style(button()).boxShadow;
    await userEvent.hover(button());
    await expect.poll(() => style(button()).boxShadow).not.toBe(rest);
  });

  test('draws the focus ring for keyboard focus', async () => {
    await render(<Fab aria-label="Add" icon={icon} />);
    await userEvent.tab();
    await expect.element(page.getByRole('button')).toHaveFocus();
    expect(style(button()).outlineStyle).toBe('solid');
    expect(px(style(button()).outlineWidth)).toBe(3);
  });

  test('shows the press ripple', async () => {
    await render(<Fab aria-label="Add" icon={icon} />);
    button().dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        buttons: 1,
        bubbles: true,
      }),
    );
    expect(button().querySelector('[data-wisp-state-layer]')).toHaveAttribute('data-pressed');
  });
});

test.describe('extended', () => {
  test('is a 56px pill-ish button with a 24px icon, 12px gap, and 16px/20px padding', async () => {
    await render(<Fab icon={icon}>Compose</Fab>);
    const fab = button('Compose');
    expect(rect(fab).height).toBe(56);
    expect(px(style(fab).borderTopLeftRadius)).toBe(16);
    expect(rect(iconSlot(fab)).left - rect(fab).left).toBe(16);
    expect(rect(fab).right - rect(page.getByText('Compose').element()).right).toBe(20);
    expect(rect(page.getByText('Compose').element()).left - rect(iconSlot(fab)).right).toBe(12);
    expect(style(fab).fontSize).toBe('14px');
    expect(style(fab).color).toBe('rgb(79, 55, 139)');
  });

  test('is named by its label', async () => {
    await render(<Fab icon={icon}>Compose</Fab>);
    await expect.element(page.getByRole('button', { name: 'Compose' })).toBeVisible();
  });

  test('has medium and large sizes with their own type and spacing', async () => {
    await render(
      <>
        <Fab size="medium" icon={icon}>
          Medium
        </Fab>
        <Fab size="large" icon={icon}>
          Large
        </Fab>
      </>,
    );
    const medium = button('Medium');
    const large = button('Large');
    expect(rect(medium).height).toBe(80);
    expect(rect(iconSlot(medium)).width).toBe(28);
    expect(rect(iconSlot(medium)).left - rect(medium).left).toBe(26);
    expect(rect(large).height).toBe(96);
    expect(rect(iconSlot(large)).width).toBe(36);
    expect(style(large).fontSize).toBe('24px');
  });

  test('folds its label away into a square when collapsed, and back out again', async () => {
    const { rerender } = await render(
      <Fab icon={icon} aria-label="Compose">
        Compose
      </Fab>,
    );
    const fab = button('Compose');
    const open = rect(fab).width;
    expect(open).toBeGreaterThan(56);

    await rerender(
      <Fab icon={icon} aria-label="Compose" collapsed>
        Compose
      </Fab>,
    );
    await expect.poll(() => Math.round(rect(fab).width)).toBe(56);
    expect(fab).toHaveAttribute('data-collapsed');

    await rerender(
      <Fab icon={icon} aria-label="Compose">
        Compose
      </Fab>,
    );
    await expect.poll(() => Math.round(rect(fab).width)).toBe(Math.round(open));
  });
});
