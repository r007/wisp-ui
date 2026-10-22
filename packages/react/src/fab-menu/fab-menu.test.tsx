import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { FabMenu, FabMenuItem, type FabMenuProps } from './fab-menu.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const toggle = () => page.getByRole('button', { name: 'Create' }).element() as HTMLElement;
// A closed menu is not rendered in the accessibility tree, so look it up by attribute.
const panel = () => document.querySelector('[role="menu"]') as HTMLElement;
const shown = () => panel().matches(':popover-open');
const item = (name: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((el) =>
    el.textContent?.trim().startsWith(name),
  ) as HTMLElement;
const focused = () => document.activeElement?.textContent?.trim();

/** Room above and beside the button, so the menu is not pushed to another side. */
const Spot = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '320px 160px 40px', display: 'flex', justifyContent: 'flex-end' }}>
    {children}
  </div>
);

function Sample(props: Partial<FabMenuProps> & { onCompose?: () => void }) {
  const { onCompose, ...menu } = props;
  return (
    <Spot>
      <FabMenu aria-label="Create" icon={<svg data-testid="add" />} {...menu}>
        <FabMenuItem icon={<svg data-testid="i" />} onClick={onCompose}>
          Compose
        </FabMenuItem>
        <FabMenuItem icon={<svg />}>Photo</FabMenuItem>
        <FabMenuItem icon={<svg />} disabled>
          Voice note
        </FabMenuItem>
        <FabMenuItem icon={<svg />}>Document</FabMenuItem>
      </FabMenu>
    </Spot>
  );
}

const open = async () => {
  await userEvent.click(toggle());
  await expect.poll(shown).toBe(true);
};
const settled = () => expect.poll(() => style(panel()).opacity).toBe('1');

test('opens from its button, which announces a menu', async () => {
  await render(<Sample />);
  expect(toggle()).toHaveAttribute('aria-haspopup', 'menu');
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  expect(shown()).toBe(false);
  await open();
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  expect(toggle().getAttribute('aria-controls')).toBe(panel().id);
  await expect.element(page.getByRole('menu', { name: 'Create' })).toBeVisible();
});

test('leaves the layout while closed, so nothing invisible takes presses or is read', async () => {
  await render(<Sample />);
  expect(style(panel()).display).toBe('none');
  expect(rect(panel()).width).toBe(0);
  await open();
  expect(style(panel()).display).not.toBe('none');
});

test('moves focus to the item nearest the button when opened', async () => {
  await render(<Sample />);
  await open();
  expect(focused()).toBe('Document');
});

test('moves between items with the arrow keys, wrapping, and skipping disabled ones', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{ArrowUp}');
  expect(focused()).toBe('Photo');
  await userEvent.keyboard('{ArrowUp}');
  expect(focused()).toBe('Compose');
  await userEvent.keyboard('{ArrowUp}');
  expect(focused()).toBe('Document');
  await userEvent.keyboard('{ArrowDown}');
  expect(focused()).toBe('Compose');
});

test('jumps with Home and End, and with typed letters', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{Home}');
  expect(focused()).toBe('Compose');
  await userEvent.keyboard('{End}');
  expect(focused()).toBe('Document');
  await userEvent.keyboard('p');
  expect(focused()).toBe('Photo');
});

test('opens on ArrowUp at the last item and on ArrowDown at the first', async () => {
  const { unmount } = await render(<Sample />);
  toggle().focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(shown).toBe(true);
  expect(focused()).toBe('Document');
  await unmount();

  await render(<Sample />);
  toggle().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(shown).toBe(true);
  expect(focused()).toBe('Compose');
});

test('closes on Escape and returns focus to the button', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{Escape}');
  await expect.poll(shown).toBe(false);
  await expect.element(page.getByRole('button', { name: 'Create' })).toHaveFocus();
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
});

test('closes on a press elsewhere, without taking focus back', async () => {
  await render(
    <>
      <Sample />
      <button type="button">Elsewhere</button>
    </>,
  );
  await open();
  await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }));
  await expect.poll(shown).toBe(false);
  await expect.element(page.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
});

test('toggles when the button is pressed again', async () => {
  await render(<Sample />);
  await open();
  await userEvent.click(toggle());
  await expect.poll(shown).toBe(false);
});

test('closes on Tab', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{Tab}');
  await expect.poll(shown).toBe(false);
});

test('runs an item’s action, then closes and returns focus to the button', async () => {
  const onCompose = vi.fn();
  await render(<Sample onCompose={onCompose} />);
  await open();
  await userEvent.click(item('Compose'));
  expect(onCompose).toHaveBeenCalledTimes(1);
  await expect.poll(shown).toBe(false);
  await expect.element(page.getByRole('button', { name: 'Create' })).toHaveFocus();
});

test('does nothing for a disabled item, and the arrows skip it', async () => {
  const onVoice = vi.fn();
  await render(
    <Spot>
      <FabMenu aria-label="Create" icon={<svg />}>
        <FabMenuItem>Photo</FabMenuItem>
        <FabMenuItem disabled onClick={onVoice}>
          Voice note
        </FabMenuItem>
        <FabMenuItem>Document</FabMenuItem>
      </FabMenu>
    </Spot>,
  );
  await open();
  expect(item('Voice note')).toBeDisabled();
  // Focus starts on Document; up goes past the disabled item to Photo.
  await userEvent.keyboard('{ArrowUp}');
  expect(focused()).toBe('Photo');
  await userEvent.click(item('Voice note'), { force: true });
  expect(onVoice).not.toHaveBeenCalled();
  expect(shown()).toBe(true);
});

test('can be controlled', async () => {
  const onOpenChange = vi.fn();
  const { rerender } = await render(<Sample open={false} onOpenChange={onOpenChange} />);
  await userEvent.click(toggle());
  expect(onOpenChange).toHaveBeenCalledWith(true);
  // Still closed: the parent has not said otherwise.
  expect(shown()).toBe(false);
  await rerender(<Sample open onOpenChange={onOpenChange} />);
  await expect.poll(shown).toBe(true);
});

test('animates out before it is hidden, in every browser', async () => {
  const { rerender } = await render(<Sample open />);
  await settled();
  await rerender(<Sample open={false} />);
  expect(shown()).toBe(true);
  expect(panel()).toHaveAttribute('data-closing');
  await expect.poll(shown).toBe(false);
});

test('an item can be a link', async () => {
  await render(
    <Spot>
      <FabMenu aria-label="Create" icon={<svg />} open>
        <FabMenuItem href="/new">New</FabMenuItem>
      </FabMenu>
    </Spot>,
  );
  expect(item('New').tagName).toBe('A');
  expect(item('New')).toHaveAttribute('href', '/new');
});

test('forwards a ref and props on an item', async () => {
  let node: HTMLElement | null = null;
  await render(
    <Spot>
      <FabMenu aria-label="Create" icon={<svg />} open>
        <FabMenuItem
          data-testid="one"
          ref={(el) => {
            node = el;
          }}
        >
          One
        </FabMenuItem>
      </FabMenu>
    </Spot>,
  );
  expect(node).toBe(document.querySelector('[data-testid="one"]'));
});

test.describe('appearance', () => {
  test('closed, the button is a primary-container FAB', async () => {
    await render(<Sample />);
    // primary-container, on-primary-container; 56px with 16px corners.
    expect(style(toggle()).backgroundColor).toBe('rgb(234, 221, 255)');
    expect(rect(toggle()).width).toBe(56);
    expect(px(style(toggle()).borderTopLeftRadius)).toBe(16);
    expect(page.getByTestId('add').element()).toBeInTheDocument();
  });

  test('closed, it can be as large as the FAB sizes', async () => {
    await render(<Sample size="large" />);
    expect(rect(toggle()).width).toBe(96);
  });

  test('open, the button is a solid 56px circle with a 20px cross', async () => {
    await render(<Sample open size="large" />);
    // Settled once the spring has run: primary, a circle, 56px, the cross at 20px.
    await expect.poll(() => rect(toggle()).width).toBe(56);
    await expect.poll(() => style(toggle()).backgroundColor).toBe('rgb(103, 80, 164)');
    await expect.poll(() => px(style(toggle()).borderTopLeftRadius)).toBe(28);
    const cross = toggle().querySelector('svg') as SVGElement;
    expect(rect(cross).width).toBe(20);
    expect(page.getByTestId('add').elements()).toHaveLength(0);
  });

  test('takes its colour set from `color`', async () => {
    await render(<Sample color="tertiary" open />);
    await settled();
    // tertiary (open button), tertiary-container (items).
    await expect.poll(() => style(toggle()).backgroundColor).toBe('rgb(125, 82, 96)');
    expect(style(item('Compose')).backgroundColor).toBe('rgb(255, 216, 228)');
  });

  test('has 56px pill items with 24px padding, an 8px icon gap and a 4px gap between', async () => {
    await render(<Sample open />);
    await settled();
    expect(rect(item('Compose')).height).toBe(56);
    expect(px(style(item('Compose')).borderTopLeftRadius)).toBeGreaterThanOrEqual(28);
    expect(
      Math.round(rect(page.getByTestId('i').element()).left - rect(item('Compose')).left),
    ).toBe(24);
    expect(rect(page.getByTestId('i').element()).width).toBe(24);
    expect(
      Math.round(
        rect(page.getByText('Compose').element()).left -
          rect(page.getByTestId('i').element()).right,
      ),
    ).toBe(8);
    expect(Math.round(rect(item('Photo')).top - rect(item('Compose')).bottom)).toBe(4);
    // primary-container, on-primary-container; no shadow at rest; title-medium.
    expect(style(item('Compose')).backgroundColor).toBe('rgb(234, 221, 255)');
    expect(style(item('Compose')).color).toBe('rgb(79, 55, 139)');
    // Elevation 0: a shadow list with no offset, blur or spread.
    expect(style(item('Compose')).boxShadow).not.toMatch(/[1-9]\d*(\.\d+)?px/);
    expect(style(item('Compose')).fontSize).toBe('16px');
  });

  test('stacks the items above the button, 8px clear of it, ends aligned', async () => {
    await render(<Sample open />);
    await settled();
    await expect.poll(() => rect(toggle()).width).toBe(56);
    expect(rect(item('Document')).bottom).toBeLessThan(rect(toggle()).top);
    expect(Math.round(rect(toggle()).top - rect(item('Document')).bottom)).toBe(8);
    // Items grow from the button's end edge, so they all end where it does.
    expect(Math.round(rect(item('Compose')).right)).toBe(Math.round(rect(toggle()).right));
    expect(Math.round(rect(item('Document')).right)).toBe(Math.round(rect(toggle()).right));
    // In reading order, top to bottom.
    expect(rect(item('Compose')).top).toBeLessThan(rect(item('Photo')).top);
  });

  test('lifts an item with a shadow on hover', async () => {
    await render(<Sample open />);
    await settled();
    await userEvent.hover(item('Photo'));
    await expect.poll(() => style(item('Photo')).boxShadow).toMatch(/[1-9]\d*(\.\d+)?px/);
  });
});
