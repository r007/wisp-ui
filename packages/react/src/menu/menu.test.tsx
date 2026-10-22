import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.js';
import { Menu, MenuDivider, MenuItem, type MenuProps } from './menu.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const trigger = () => page.getByRole('button', { name: 'Options' }).element() as HTMLElement;
// A closed menu is not rendered, so look it up by attribute.
const panel = () => document.querySelector('[role="menu"]') as HTMLElement;
const shown = () => panel().matches(':popover-open');
// Items are menuitem, menuitemcheckbox or menuitemradio, which one role query cannot span.
const item = (name: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find((el) =>
    el.textContent?.trim().startsWith(name),
  ) as HTMLElement;
const focused = () => document.activeElement?.textContent?.trim();

/** Room around the trigger, so the menu is not pushed to another side. */
const Spot = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '200px 160px' }}>{children}</div>
);

function Sample(props: Partial<MenuProps> & { onEdit?: () => void }) {
  const { onEdit, ...menu } = props;
  return (
    <Spot>
      <Menu trigger={<Button>Options</Button>} {...menu}>
        <MenuItem onClick={onEdit}>Edit</MenuItem>
        <MenuItem>Duplicate</MenuItem>
        <MenuDivider />
        <MenuItem disabled>Share</MenuItem>
        <MenuItem>Delete</MenuItem>
      </Menu>
    </Spot>
  );
}

const open = async () => {
  await userEvent.click(trigger());
  await expect.poll(shown).toBe(true);
};

test('opens from its trigger, which announces a menu', async () => {
  await render(<Sample />);
  expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
  expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  expect(shown()).toBe(false);
  await open();
  expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  expect(trigger().getAttribute('aria-controls')).toBe(panel().id);
  await expect.element(page.getByRole('menu', { name: 'Options' })).toBeVisible();
});

test('is named by aria-label when it has one', async () => {
  await render(<Sample aria-label="Item actions" />);
  await open();
  await expect.element(page.getByRole('menu', { name: 'Item actions' })).toBeVisible();
});

test('moves focus to the first item when opened', async () => {
  await render(<Sample />);
  await open();
  expect(focused()).toBe('Edit');
});

test('moves between items with the arrow keys, wrapping, and skipping disabled ones', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{ArrowDown}');
  expect(focused()).toBe('Duplicate');
  // "Share" is disabled.
  await userEvent.keyboard('{ArrowDown}');
  expect(focused()).toBe('Delete');
  await userEvent.keyboard('{ArrowDown}');
  expect(focused()).toBe('Edit');
  await userEvent.keyboard('{ArrowUp}');
  expect(focused()).toBe('Delete');
});

test('jumps with Home and End, and with typed letters', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{End}');
  expect(focused()).toBe('Delete');
  await userEvent.keyboard('{Home}');
  expect(focused()).toBe('Edit');
  await userEvent.keyboard('d');
  expect(focused()).toBe('Duplicate');
  await userEvent.keyboard('d');
  expect(focused()).toBe('Delete');
});

test('opens on ArrowDown at the first item and on ArrowUp at the last', async () => {
  const { unmount } = await render(<Sample />);
  trigger().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(shown).toBe(true);
  expect(focused()).toBe('Edit');
  await unmount();

  await render(<Sample />);
  trigger().focus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(shown).toBe(true);
  expect(focused()).toBe('Delete');
});

test('closes on Escape and returns focus to the trigger', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{Escape}');
  await expect.poll(shown).toBe(false);
  await expect.element(page.getByRole('button', { name: 'Options' })).toHaveFocus();
  expect(trigger()).toHaveAttribute('aria-expanded', 'false');
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

test('toggles when the trigger is pressed again', async () => {
  await render(<Sample />);
  await open();
  await userEvent.click(trigger());
  await expect.poll(shown).toBe(false);
});

test('closes on Tab', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{Tab}');
  await expect.poll(shown).toBe(false);
});

test('runs an item’s action, then closes and returns focus to the trigger', async () => {
  const onEdit = vi.fn();
  await render(<Sample onEdit={onEdit} />);
  await open();
  await userEvent.click(item('Edit'));
  expect(onEdit).toHaveBeenCalledTimes(1);
  await expect.poll(shown).toBe(false);
  await expect.element(page.getByRole('button', { name: 'Options' })).toHaveFocus();
});

test('runs an item with Enter, too', async () => {
  const onEdit = vi.fn();
  await render(<Sample onEdit={onEdit} />);
  await open();
  await userEvent.keyboard('{Enter}');
  expect(onEdit).toHaveBeenCalledTimes(1);
  await expect.poll(shown).toBe(false);
});

test('does nothing for a disabled item, and keeps the menu open for keepOpen', async () => {
  const onShare = vi.fn();
  const onToggle = vi.fn();
  await render(
    <Spot>
      <Menu trigger={<Button>Options</Button>}>
        <MenuItem disabled onClick={onShare}>
          Share
        </MenuItem>
        <MenuItem role="menuitemcheckbox" checked keepOpen onClick={onToggle}>
          Show hidden
        </MenuItem>
      </Menu>
    </Spot>,
  );
  await open();
  await userEvent.click(item('Share'), { force: true });
  expect(onShare).not.toHaveBeenCalled();
  expect(shown()).toBe(true);
  await userEvent.click(item('Show hidden'));
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(shown()).toBe(true);
});

function ControlledMenu() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Sample open={isOpen} onOpenChange={setOpen} />
      <button type="button" onClick={() => setOpen(true)}>
        External
      </button>
    </>
  );
}

test('can be controlled', async () => {
  await render(<ControlledMenu />);
  await userEvent.click(page.getByRole('button', { name: 'External' }));
  await expect.poll(shown).toBe(true);
  await userEvent.keyboard('{Escape}');
  await expect.poll(shown).toBe(false);
});

test('animates out before it is hidden, in every browser', async () => {
  const { rerender } = await render(<Sample open />);
  await expect.poll(() => style(panel()).opacity).toBe('1');
  await rerender(<Sample open={false} />);
  expect(shown()).toBe(true);
  expect(panel()).toHaveAttribute('data-closing');
  await expect.poll(shown).toBe(false);
});

test.describe('appearance', () => {
  test('is a low surface with 16px corners, 2px padding and a shadow', async () => {
    await render(<Sample open />);
    await expect.poll(() => style(panel()).opacity).toBe('1');
    // surface-container-low.
    expect(style(panel()).backgroundColor).toBe('rgb(247, 242, 250)');
    expect(px(style(panel()).borderTopLeftRadius)).toBe(16);
    expect(px(style(panel()).paddingLeft)).toBe(2);
    expect(style(panel()).boxShadow).not.toBe('none');
  });

  test('has 44px items with 16px padding, a 4px gap to a 12px end radius', async () => {
    await render(<Sample open />);
    await expect.poll(() => style(panel()).opacity).toBe('1');
    expect(rect(item('Edit')).height).toBe(44);
    expect(rect(item('Duplicate')).height).toBe(44);
    // Ends of the group round to 12px; the corners between items are 4px.
    expect(px(style(item('Edit')).borderTopLeftRadius)).toBe(12);
    expect(px(style(item('Edit')).borderBottomLeftRadius)).toBe(4);
    expect(px(style(item('Duplicate')).borderTopLeftRadius)).toBe(4);
    expect(px(style(item('Delete')).borderBottomLeftRadius)).toBe(12);
    expect(rect(page.getByText('Edit').element()).left - rect(item('Edit')).left).toBe(16);
  });

  test('shows leading icons at 20px and trailing text', async () => {
    await render(
      <Spot>
        <Menu trigger={<Button>Options</Button>} open>
          <MenuItem leading={<svg data-testid="i" />} trailing="⌘E" trailingKind="text">
            Edit
          </MenuItem>
        </Menu>
      </Spot>,
    );
    await expect.poll(() => style(panel()).opacity).toBe('1');
    expect(rect(page.getByTestId('i').element()).width).toBe(20);
    expect(page.getByText('⌘E').element()).toBeInTheDocument();
  });

  test('tints a checked item with tertiary-container and rounds it to 12px', async () => {
    await render(
      <Spot>
        <Menu trigger={<Button>Options</Button>} open>
          <MenuItem role="menuitemcheckbox" checked>
            Sync
          </MenuItem>
          <MenuItem role="menuitemcheckbox">Backup</MenuItem>
        </Menu>
      </Spot>,
    );
    await expect.poll(() => style(item('Sync')).backgroundColor).toBe('rgb(255, 216, 228)');
    expect(item('Sync')).toHaveAttribute('aria-checked', 'true');
    expect(item('Backup')).toHaveAttribute('aria-checked', 'false');
    expect(px(style(item('Sync')).borderBottomLeftRadius)).toBe(12);
    // Unselected, and last in the group: 12px below, 4px above.
    expect(px(style(item('Backup')).borderBottomLeftRadius)).toBe(12);
    expect(px(style(item('Backup')).borderTopLeftRadius)).toBe(4);
  });

  test('can be vibrant: a tertiary container', async () => {
    await render(<Sample open scheme="vibrant" />);
    await expect.poll(() => style(panel()).backgroundColor).toBe('rgb(255, 216, 228)');
  });

  test('draws the focus ring inside the focused item', async () => {
    await render(<Sample />);
    await open();
    await userEvent.keyboard('{ArrowDown}');
    const style2 = style(item('Duplicate'));
    expect(style2.outlineStyle).toBe('solid');
    expect(px(style2.outlineOffset)).toBe(-3);
  });

  test('has a divider between groups', async () => {
    await render(<Sample open />);
    await expect.poll(() => style(panel()).opacity).toBe('1');
    expect(page.getByRole('separator').element()).toBeInTheDocument();
  });
});

test.describe('placement', () => {
  test('opens below the trigger, aligned to its start edge', async () => {
    await render(<Sample open />);
    await expect.poll(() => Math.round(rect(panel()).top - rect(trigger()).bottom)).toBe(2);
    expect(Math.round(rect(panel()).left - rect(trigger()).left)).toBe(0);
  });

  test('can align to the end edge, or open above', async () => {
    const { rerender } = await render(<Sample open placement="bottom-end" />);
    await expect.poll(() => Math.round(rect(trigger()).right - rect(panel()).right)).toBe(0);
    await rerender(<Sample open placement="top-start" />);
    await expect.poll(() => Math.round(rect(trigger()).top - rect(panel()).bottom)).toBe(2);
  });

  test('flips above when there is no room below', async () => {
    await render(
      <div style={{ position: 'fixed', insetBlockEnd: 8, insetInlineStart: 24 }}>
        <Menu trigger={<Button>Options</Button>} open>
          <MenuItem>One</MenuItem>
          <MenuItem>Two</MenuItem>
          <MenuItem>Three</MenuItem>
        </Menu>
      </div>,
    );
    await expect.poll(() => rect(panel()).bottom).toBeLessThanOrEqual(rect(trigger()).top + 1);
  });
});

test('an item can be a link', async () => {
  await render(
    <Spot>
      <Menu trigger={<Button>Options</Button>} open>
        <MenuItem href="/settings">Settings</MenuItem>
      </Menu>
    </Spot>,
  );
  expect(item('Settings').tagName).toBe('A');
  expect(item('Settings')).toHaveAttribute('href', '/settings');
});
