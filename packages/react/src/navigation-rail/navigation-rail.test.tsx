import type { ReactNode } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { NavigationRail, NavigationRailItem, type NavigationRailProps } from './navigation-rail.js';

const Icon = ({ id }: { id: string }) => <svg data-testid={id} />;

function Rail({ children, ...props }: Partial<NavigationRailProps> & { children?: ReactNode }) {
  return (
    <NavigationRail aria-label="Primary" {...props}>
      {children ?? (
        <>
          <NavigationRailItem
            value="home"
            label="Home"
            icon={<Icon id="home" />}
            activeIcon={<Icon id="home-on" />}
          />
          <NavigationRailItem value="search" label="Search" icon={<Icon id="search" />} />
          <NavigationRailItem value="inbox" label="Inbox" icon={<Icon id="inbox" />} badge={3} />
        </>
      )}
    </NavigationRail>
  );
}

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const item = (name: string) => page.getByRole('button', { name });
const slot = (name: string, slotName: string) =>
  item(name).element().querySelector(`[data-slot="${slotName}"]`) as HTMLElement;
const pill = (name: string) => slot(name, 'indicator');
const nav = () => page.getByRole('navigation', { name: 'Primary' }).element() as HTMLElement;

test('is a named navigation landmark containing a list of destinations', async () => {
  await render(<Rail defaultValue="home" />);
  await expect.element(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  expect(page.getByRole('listitem').elements()).toHaveLength(3);
});

test('marks only the current destination with aria-current, not as pressed', async () => {
  await render(<Rail defaultValue="search" />);
  await expect.element(item('Search')).toHaveAttribute('aria-current', 'page');
  await expect.element(item('Home')).not.toHaveAttribute('aria-current');
  await expect.element(item('Search')).not.toHaveAttribute('aria-pressed');
});

test('selects on click, uncontrolled, and reports the value', async () => {
  const onValueChange = vi.fn();
  await render(<Rail defaultValue="home" onValueChange={onValueChange} />);
  await userEvent.click(item('Search'));
  await expect.element(item('Search')).toHaveAttribute('aria-current', 'page');
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith('search');
  await userEvent.click(item('Search'));
  expect(onValueChange).toHaveBeenCalledTimes(1);
});

test('stays on the controlled value until the parent changes it', async () => {
  const onValueChange = vi.fn();
  const { rerender } = await render(<Rail value="home" onValueChange={onValueChange} />);
  await userEvent.click(item('Search'));
  expect(onValueChange).toHaveBeenCalledWith('search');
  await expect.element(item('Home')).toHaveAttribute('aria-current', 'page');
  await rerender(<Rail value="search" onValueChange={onValueChange} />);
  await expect.element(item('Search')).toHaveAttribute('aria-current', 'page');
});

test('renders links when given an href', async () => {
  await render(
    <Rail defaultValue="a">
      <NavigationRailItem value="a" label="Docs" icon={<Icon id="a" />} href="/docs" />
    </Rail>,
  );
  expect(page.getByRole('link', { name: 'Docs' }).element()).toHaveAttribute('href', '/docs');
  await expect
    .element(page.getByRole('link', { name: 'Docs' }))
    .toHaveAttribute('aria-current', 'page');
});

test('throws a helpful error when an item is used outside a rail', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(
    render(<NavigationRailItem value="a" label="A" icon={<Icon id="a" />} />),
  ).rejects.toThrow('NavigationRail');
  errors.mockRestore();
});

test.describe('collapsed', () => {
  test('is a 96px surface column, 44px below its top', async () => {
    await render(<Rail defaultValue="home" />);
    expect(rect(nav()).width).toBe(96);
    expect(style(nav()).backgroundColor).toBe('rgb(254, 247, 255)');
    expect(rect(item('Home').element()).top - rect(nav()).top).toBe(44);
  });

  test('can be a narrow 80px column', async () => {
    await render(<Rail defaultValue="home" narrow />);
    expect(rect(nav()).width).toBe(80);
  });

  test('stacks 64px items 4px apart', async () => {
    await render(<Rail defaultValue="home" />);
    expect(rect(item('Home').element()).height).toBe(64);
    expect(rect(item('Search').element()).top - rect(item('Home').element()).bottom).toBe(4);
  });

  test('draws a 56x32 pill with the icon in it and the label under it', async () => {
    await render(<Rail defaultValue="home" />);
    expect(rect(pill('Home')).width).toBe(56);
    expect(rect(pill('Home')).height).toBe(32);
    expect(rect(slot('Home', 'icon')).width).toBe(24);
    expect(rect(slot('Home', 'label')).top).toBeGreaterThanOrEqual(rect(pill('Home')).bottom);
    // label-medium.
    expect(style(item('Home').element()).fontSize).toBe('12px');
  });

  test('fills the pill with secondary-container and colours the label secondary when selected', async () => {
    await render(<Rail defaultValue="home" />);
    await expect
      .poll(() => style(pill('Home'), '::before').backgroundColor)
      .toBe('rgb(232, 222, 248)');
    expect(style(slot('Home', 'label')).color).toBe('rgb(98, 91, 113)');
    expect(style(slot('Search', 'label')).color).toBe('rgb(73, 69, 79)');
  });

  test('swaps to the active icon when selected', async () => {
    await render(<Rail defaultValue="home" />);
    await expect
      .poll(() => style(page.getByTestId('home-on').element().parentElement as Element).opacity)
      .toBe('1');
    expect(style(page.getByTestId('home').element().parentElement as Element).opacity).toBe('0');
  });

  test('hides inactive labels but keeps them accessible', async () => {
    await render(<Rail defaultValue="home" labelBehavior="selected" />);
    await expect.poll(() => style(slot('Search', 'label')).opacity).toBe('0');
    await expect.element(item('Search')).toBeVisible();
  });

  test('never shows labels, yet they still name the destinations', async () => {
    await render(<Rail defaultValue="home" labelBehavior="never" />);
    expect(item('Search').element().querySelector('[data-slot="label"]')?.textContent).toBe(
      'Search',
    );
    expect(rect(item('Search').element()).height).toBe(64);
  });
});

test.describe('expanded', () => {
  test('is at least 220px wide, with 16px beside its pills', async () => {
    await render(<Rail defaultValue="home" expanded />);
    expect(rect(nav()).width).toBeGreaterThanOrEqual(220);
    expect(rect(nav()).width).toBeLessThanOrEqual(360);
    expect(Math.round(rect(item('Home').element()).left - rect(nav()).left)).toBe(16);
  });

  test('draws a 56px pill spanning the rail, with the icon and label inside', async () => {
    await render(<Rail defaultValue="home" expanded />);
    expect(rect(pill('Home')).height).toBe(56);
    expect(Math.round(rect(pill('Home')).width)).toBe(Math.round(rect(nav()).width - 32));
    expect(Math.round(rect(slot('Home', 'icon')).left - rect(pill('Home')).left)).toBe(16);
    // The label sits beside the icon, 8px away, in label-large.
    expect(Math.round(rect(slot('Home', 'label')).left - rect(slot('Home', 'icon')).right)).toBe(8);
    expect(style(item('Home').element()).fontSize).toBe('14px');
  });

  test('stacks pills 6px apart, and always shows labels', async () => {
    await render(<Rail defaultValue="home" expanded labelBehavior="never" />);
    expect(
      Math.round(rect(item('Search').element()).top - rect(item('Home').element()).bottom),
    ).toBe(6);
    expect(style(slot('Search', 'label')).opacity).toBe('1');
  });

  test('fills the selected pill', async () => {
    await render(<Rail defaultValue="home" expanded />);
    await expect
      .poll(() => style(pill('Home'), '::before').backgroundColor)
      .toBe('rgb(232, 222, 248)');
  });
});

test('shows a header above the destinations', async () => {
  await render(<Rail defaultValue="home" header={<button type="button">Menu</button>} />);
  expect(rect(page.getByRole('button', { name: 'Menu' }).element()).bottom).toBeLessThan(
    rect(item('Home').element()).top,
  );
});

test.describe('badges', () => {
  test('announces a count after the label', async () => {
    await render(<Rail defaultValue="home" />);
    await expect.element(item('Inbox 3')).toBeVisible();
  });
});

test.describe('interaction states', () => {
  test('tints the pill on hover', async () => {
    await render(<Rail defaultValue="home" />);
    await userEvent.hover(item('Search'));
    await expect
      .poll(() =>
        Number.parseFloat(
          style(pill('Search').querySelector('[data-wisp-state-layer]') as Element, '::before')
            .opacity,
        ),
      )
      .toBeCloseTo(0.08, 2);
  });

  test('draws the focus ring inside the item', async () => {
    await render(<Rail defaultValue="home" />);
    await userEvent.tab();
    expect(style(item('Home').element()).outlineStyle).toBe('solid');
    expect(px(style(item('Home').element()).outlineWidth)).toBe(3);
  });
});

test('lets a consumer swap the element, e.g. for a router link', async () => {
  const own = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
  await render(
    <Rail defaultValue="a">
      <NavigationRailItem
        value="a"
        label="Go"
        icon={<Icon id="a" />}
        render={<a href="/x" className="router-link" onClick={own} />}
      />
    </Rail>,
  );
  const link = page.getByRole('link', { name: 'Go' });
  expect(link.element()).toHaveClass('router-link');
  await userEvent.click(link);
  expect(own).toHaveBeenCalled();
});
