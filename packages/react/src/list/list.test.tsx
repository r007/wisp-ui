import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { List, ListDivider, ListItem } from './list.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
/** The visual element of an item: the child of its `<li>`. */
const item = (name: string | RegExp) =>
  page.getByText(name).element().closest('li')?.firstElementChild as HTMLElement;
const leading = (el: Element) => el.querySelector('[data-kind]') as HTMLElement;

test('is a list of items', async () => {
  await render(
    <List aria-label="Inbox">
      <ListItem headline="First" />
      <ListItem headline="Second" />
    </List>,
  );
  await expect.element(page.getByRole('list', { name: 'Inbox' })).toBeVisible();
  expect(page.getByRole('listitem').elements()).toHaveLength(2);
});

test.describe('layout', () => {
  test('is 56, 72 or 88px tall by its number of lines', async () => {
    await render(
      <List>
        <ListItem headline="One" />
        <ListItem headline="Two" supportingText="Supporting" />
        <ListItem headline="Three" overline="Overline" supportingText="Supporting" />
      </List>,
    );
    expect(rect(item('One')).height).toBe(56);
    expect(rect(item('Two')).height).toBe(72);
    expect(rect(item('Three')).height).toBe(88);
  });

  test('pads 16px on each side and 12px between the parts', async () => {
    await render(
      <List>
        <ListItem
          headline="Item"
          leading={<svg data-testid="i" />}
          trailing={<svg data-testid="t" />}
        />
      </List>,
    );
    const row = item('Item');
    expect(rect(page.getByTestId('i').element()).left - rect(row).left).toBe(16);
    expect(rect(row).right - rect(page.getByTestId('t').element()).right).toBe(16);
    expect(
      rect(page.getByText('Item').element()).left - rect(page.getByTestId('i').element()).right,
    ).toBe(12);
  });

  test('sizes a leading icon, avatar, image and video', async () => {
    await render(
      <List>
        <ListItem headline="Icon" leading={<svg />} />
        <ListItem headline="Avatar" leadingKind="avatar" leading="AB" />
        <ListItem headline="Image" leadingKind="image" leading={<img alt="" />} />
        <ListItem headline="Video" leadingKind="video" leading={<div />} />
      </List>,
    );
    expect(rect(leading(item('Icon'))).width).toBe(24);
    expect(rect(leading(item('Avatar'))).width).toBe(40);
    expect(rect(leading(item('Avatar'))).height).toBe(40);
    expect(px(style(leading(item('Avatar'))).borderTopLeftRadius)).toBeGreaterThanOrEqual(20);
    expect(rect(leading(item('Image'))).width).toBe(56);
    expect(rect(leading(item('Image'))).height).toBe(56);
    expect(px(style(leading(item('Image'))).borderTopLeftRadius)).toBe(8);
    expect(rect(leading(item('Video'))).width).toBe(100);
    expect(rect(leading(item('Video'))).height).toBe(56);
  });

  test('shows trailing text as text', async () => {
    await render(
      <List>
        <ListItem headline="Item" trailing="10 min" trailingKind="text" />
      </List>,
    );
    expect(style(page.getByText('10 min').element()).fontSize).toBe('11px');
    expect(style(page.getByText('10 min').element()).color).toBe('rgb(73, 69, 79)');
  });

  test('colours the headline on-surface and its supporting text on-surface-variant', async () => {
    await render(
      <List>
        <ListItem headline="Head" overline="Over" supportingText="Support" />
      </List>,
    );
    expect(style(page.getByText('Head').element()).color).toBe('rgb(29, 27, 32)');
    expect(style(page.getByText('Support').element()).color).toBe('rgb(73, 69, 79)');
    expect(style(page.getByText('Over').element()).color).toBe('rgb(73, 69, 79)');
  });
});

test.describe('interactive', () => {
  test('is a plain row without onClick or href', async () => {
    await render(
      <List>
        <ListItem headline="Static" />
      </List>,
    );
    expect(item('Static').tagName).toBe('DIV');
    expect(item('Static').querySelector('[data-wisp-state-layer]')).toBeNull();
  });

  test('is a button with onClick, operated by click and keyboard', async () => {
    const onClick = vi.fn();
    await render(
      <List>
        <ListItem headline="Open" onClick={onClick} />
      </List>,
    );
    const button = page.getByRole('button', { name: 'Open' });
    await userEvent.click(button);
    (button.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  test('is a link with href', async () => {
    await render(
      <List>
        <ListItem headline="Docs" href="/docs" />
      </List>,
    );
    expect(page.getByRole('link', { name: 'Docs' }).element()).toHaveAttribute('href', '/docs');
  });

  test('does not respond when disabled, and fades', async () => {
    const onClick = vi.fn();
    await render(
      <List>
        <ListItem headline="Off" supportingText="Support" onClick={onClick} disabled />
      </List>,
    );
    await expect.element(page.getByRole('button')).toBeDisabled();
    await userEvent.click(page.getByRole('button'), { force: true });
    expect(onClick).not.toHaveBeenCalled();
    expect(style(page.getByText('Off').element()).color).toMatch(/0\.38|38%/);
  });

  test('draws the focus ring inside the row for keyboard focus', async () => {
    await render(
      <List>
        <ListItem headline="Open" onClick={() => {}} />
      </List>,
    );
    await userEvent.tab();
    await expect.element(page.getByRole('button')).toHaveFocus();
    const row = style(item('Open'));
    expect(row.outlineStyle).toBe('solid');
    expect(px(row.outlineWidth)).toBe(3);
    expect(px(row.outlineOffset)).toBe(-3);
  });

  test('shows the press ripple', async () => {
    await render(
      <List>
        <ListItem headline="Open" onClick={() => {}} />
      </List>,
    );
    page
      .getByRole('button')
      .element()
      .dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          buttons: 1,
          bubbles: true,
        }),
      );
    expect(item('Open').querySelector('[data-wisp-state-layer]')).toHaveAttribute('data-pressed');
  });
});

test.describe('selected', () => {
  test('tints the container secondary-container and marks the item current', async () => {
    await render(
      <List>
        <ListItem headline="Inbox" href="/inbox" selected />
        <ListItem headline="Sent" href="/sent" />
      </List>,
    );
    await expect
      .element(page.getByRole('link', { name: 'Inbox' }))
      .toHaveAttribute('aria-current', 'true');
    expect(page.getByRole('link', { name: 'Sent' }).element()).not.toHaveAttribute('aria-current');
    await expect.poll(() => style(item('Inbox')).backgroundColor).toBe('rgb(232, 222, 248)');
    // A selected item is rounded to 16px.
    await expect.poll(() => px(style(item('Inbox')).borderTopLeftRadius)).toBe(16);
    expect(px(style(item('Sent')).borderTopLeftRadius)).toBe(0);
  });

  test('uses aria-selected instead when the item has a selection role', async () => {
    await render(
      <List role="listbox" aria-label="Fruit">
        <ListItem role="option" headline="Apple" onClick={() => {}} selected />
        <ListItem role="option" headline="Pear" onClick={() => {}} />
      </List>,
    );
    await expect
      .element(page.getByRole('option', { name: 'Apple' }))
      .toHaveAttribute('aria-selected', 'true');
    await expect
      .element(page.getByRole('option', { name: 'Pear' }))
      .toHaveAttribute('aria-selected', 'false');
    expect(page.getByRole('option', { name: 'Apple' }).element()).not.toHaveAttribute(
      'aria-current',
    );
  });
});

test.describe('segmented', () => {
  test('separates items by 2px and rounds them to 4px', async () => {
    await render(
      <List segmented>
        <ListItem headline="A" />
        <ListItem headline="B" />
      </List>,
    );
    expect(rect(item('B')).top - rect(item('A')).bottom).toBe(2);
    expect(px(style(item('A')).borderTopLeftRadius)).toBe(4);
  });

  test('opens a segment’s corners on hover and rounds them further on selection', async () => {
    await render(
      <List segmented>
        <ListItem headline="A" onClick={() => {}} />
        <ListItem headline="B" onClick={() => {}} selected />
      </List>,
    );
    await userEvent.hover(item('A'));
    await expect.poll(() => px(style(item('A')).borderTopLeftRadius)).toBe(12);
    await expect.poll(() => px(style(item('B')).borderTopLeftRadius)).toBe(16);
  });
});

test('ListDivider is a visual rule inset by 16px that is not counted as an item', async () => {
  await render(
    <List aria-label="Folders">
      <ListItem headline="A" />
      <ListDivider />
      <ListItem headline="B" />
    </List>,
  );
  expect(page.getByRole('listitem').elements()).toHaveLength(2);
  const rule = document.querySelector('hr') as HTMLElement;
  expect(px(style(rule).marginInlineStart)).toBe(16);
  expect(px(style(rule).marginInlineEnd)).toBe(16);
  expect(px(style(rule).borderTopWidth)).toBe(1);
});
