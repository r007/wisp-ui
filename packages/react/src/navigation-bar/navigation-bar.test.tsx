import type { ReactNode } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { NavigationBar, NavigationBarItem, type NavigationBarProps } from './navigation-bar.js';

const Icon = ({ id }: { id: string }) => <svg data-testid={id} />;

function Bar({ children, ...props }: Partial<NavigationBarProps> & { children?: ReactNode }) {
  return (
    <NavigationBar aria-label="Primary" {...props}>
      {children ?? (
        <>
          <NavigationBarItem
            value="home"
            label="Home"
            icon={<Icon id="home" />}
            activeIcon={<Icon id="home-on" />}
          />
          <NavigationBarItem value="search" label="Search" icon={<Icon id="search" />} />
          <NavigationBarItem value="inbox" label="Inbox" icon={<Icon id="inbox" />} badge={3} />
        </>
      )}
    </NavigationBar>
  );
}

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const item = (name: string) => page.getByRole('button', { name });
const slot = (name: string, slotName: string) =>
  item(name).element().querySelector(`[data-slot="${slotName}"]`) as HTMLElement;
const pill = (name: string) => slot(name, 'indicator');

test('is a named navigation landmark containing a list of destinations', async () => {
  await render(<Bar defaultValue="home" />);
  await expect.element(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  expect(page.getByRole('listitem').elements()).toHaveLength(3);
});

test('marks only the current destination with aria-current, not as pressed', async () => {
  await render(<Bar defaultValue="search" />);
  await expect.element(item('Search')).toHaveAttribute('aria-current', 'page');
  await expect.element(item('Home')).not.toHaveAttribute('aria-current');
  await expect.element(item('Search')).not.toHaveAttribute('aria-pressed');
});

test('selects on click, uncontrolled, and reports the value', async () => {
  const onValueChange = vi.fn();
  await render(<Bar defaultValue="home" onValueChange={onValueChange} />);
  await userEvent.click(item('Search'));
  await expect.element(item('Search')).toHaveAttribute('aria-current', 'page');
  await expect.element(item('Home')).not.toHaveAttribute('aria-current');
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith('search');

  // Re-selecting the current destination is not a change.
  await userEvent.click(item('Search'));
  expect(onValueChange).toHaveBeenCalledTimes(1);
});

test('stays on the controlled value until the parent changes it', async () => {
  const onValueChange = vi.fn();
  const { rerender } = await render(<Bar value="home" onValueChange={onValueChange} />);
  await userEvent.click(item('Search'));
  expect(onValueChange).toHaveBeenCalledWith('search');
  await expect.element(item('Home')).toHaveAttribute('aria-current', 'page');

  await rerender(<Bar value="search" onValueChange={onValueChange} />);
  await expect.element(item('Search')).toHaveAttribute('aria-current', 'page');
});

test('keeps its icon visible when selected and there is no active icon', async () => {
  await render(<Bar defaultValue="home" />);
  const opacity = (id: string) =>
    getComputedStyle(page.getByTestId(id).element().parentElement as HTMLElement).opacity;
  // Search has no `activeIcon`: selecting it must not fade its only icon out. Let the fade
  // finish first, or the icon would still be at full opacity when it is read.
  await userEvent.click(item('Search'));
  await expect.element(item('Search')).toHaveAttribute('aria-current', 'page');
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  expect(opacity('search')).toBe('1');
  // Home has one, so the two swap places.
  await userEvent.click(item('Home'));
  await expect.poll(() => opacity('home')).toBe('0');
  await expect.poll(() => opacity('home-on')).toBe('1');
});

test('activates with the keyboard', async () => {
  await render(<Bar defaultValue="home" />);
  await userEvent.tab();
  await userEvent.tab();
  await expect.element(item('Search')).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect.element(item('Search')).toHaveAttribute('aria-current', 'page');
});

test('renders links when given an href', async () => {
  await render(
    <Bar defaultValue="home">
      <NavigationBarItem value="home" label="Home" icon={<Icon id="h" />} href="/home" />
    </Bar>,
  );
  const link = page.getByRole('link', { name: 'Home' });
  await expect.element(link).toHaveAttribute('href', '/home');
  await expect.element(link).toHaveAttribute('aria-current', 'page');
});

test('throws a helpful error when an item is used outside a bar', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await expect(render(<NavigationBarItem value="x" label="x" icon={null} />)).rejects.toThrow(
    /inside a <NavigationBar>/,
  );
  error.mockRestore();
});

test.describe('Material geometry', () => {
  test('is a 64px surface-container bar', async () => {
    await render(<Bar defaultValue="home" />);
    const nav = page.getByRole('navigation').element();
    expect(rect(nav).height).toBe(64);
    expect(getComputedStyle(nav).backgroundColor).toBe('rgb(243, 237, 247)');
  });

  test('vertical: a 56x32 pill with 6px above it and the label below', async () => {
    await render(<Bar defaultValue="home" />);
    const indicator = rect(pill('Home'));
    expect(indicator.width).toBe(56);
    expect(indicator.height).toBe(32);
    expect(indicator.top - rect(page.getByRole('navigation').element()).top).toBe(6);
  });

  test('horizontal: a 40px pill hugging the icon and label', async () => {
    await render(<Bar defaultValue="home" layout="horizontal" />);
    const indicator = rect(pill('Home'));
    expect(indicator.height).toBe(40);
    // 16px padding either side of a 24px icon, 4px gap and the label.
    expect(indicator.width).toBeGreaterThan(16 + 24 + 4 + 16);
  });

  test('sets the label in the label-medium type style', async () => {
    await render(<Bar defaultValue="home" />);
    const style = getComputedStyle(item('Home').element());
    expect(style.fontSize).toBe('12px');
    expect(style.fontWeight).toBe('500');
  });
});

test.describe('active state', () => {
  test('colours the selected label and shows the indicator', async () => {
    await render(<Bar defaultValue="home" />);
    // secondary vs on-surface-variant.
    expect(getComputedStyle(item('Home').element()).color).toBe('rgb(98, 91, 113)');
    expect(getComputedStyle(item('Search').element()).color).toBe('rgb(73, 69, 79)');

    const fill = (name: string) => getComputedStyle(pill(name), '::before');
    expect(fill('Home').backgroundColor).toBe('rgb(232, 222, 248)');
    await expect.poll(() => fill('Home').opacity).toBe('1');
    expect(fill('Search').opacity).toBe('0');
  });

  test('animates the indicator in from the centre when selected', async () => {
    await render(<Bar defaultValue="home" />);
    expect(getComputedStyle(pill('Search'), '::before').transform).toMatch(/matrix\(0, 0, 0, 1/);
    await userEvent.click(item('Search'));
    await expect
      .poll(() => getComputedStyle(pill('Search'), '::before').transform)
      .toBe('matrix(1, 0, 0, 1, 0, 0)');
  });

  test('swaps to the active icon', async () => {
    await render(<Bar defaultValue="search" />);
    const opacity = (id: string) =>
      getComputedStyle(page.getByTestId(id).element().parentElement as Element).opacity;
    expect(opacity('home')).toBe('1');
    expect(opacity('home-on')).toBe('0');

    await userEvent.click(item('Home'));
    await expect.poll(() => opacity('home-on')).toBe('1');
    await expect.poll(() => opacity('home')).toBe('0');
  });
});

test.describe('label behaviour', () => {
  test('hides inactive labels but keeps them accessible', async () => {
    await render(<Bar defaultValue="home" labelBehavior="selected" />);
    // The button is still named "Search" for assistive technology.
    const label = slot('Search', 'label');
    await expect.poll(() => getComputedStyle(label).opacity).toBe('0');
    expect(rect(label).height).toBe(0);
  });

  test('shows the selected label', async () => {
    await render(<Bar defaultValue="home" labelBehavior="selected" />);
    const label = slot('Home', 'label');
    expect(getComputedStyle(label).opacity).toBe('1');
    expect(rect(label).height).toBeGreaterThan(0);
  });

  test('never: labels are visually hidden yet still name the destinations', async () => {
    await render(<Bar defaultValue="home" labelBehavior="never" />);
    await expect.element(item('Home')).toBeVisible();
    await expect.element(item('Search')).toBeVisible();
    expect(rect(slot('Search', 'label')).width).toBeLessThanOrEqual(1);
  });
});

test.describe('badges', () => {
  test('shows a count as a large badge', async () => {
    await render(<Bar defaultValue="home" />);
    const inbox = item('Inbox 3');
    await expect.element(inbox).toBeVisible();
    const badge = inbox.element().querySelector('[data-slot="badge"] > span') as HTMLElement;
    expect(rect(badge).height).toBe(16);
    // error / on-error
    expect(getComputedStyle(badge).backgroundColor).toBe('rgb(179, 38, 30)');
  });

  test('shows a dot, with a text alternative for assistive technology', async () => {
    await render(
      <Bar defaultValue="home">
        <NavigationBarItem
          value="inbox"
          label="Inbox"
          icon={<Icon id="i" />}
          badge
          badgeLabel="new messages"
        />
      </Bar>,
    );
    const inbox = item('Inbox new messages');
    await expect.element(inbox).toBeVisible();
    const dot = inbox.element().querySelector('[data-slot="badge"] > span') as HTMLElement;
    expect(rect(dot).width).toBe(6);
    expect(rect(dot).height).toBe(6);
  });
});

test.describe('interaction states', () => {
  test('tints the pill on hover', async () => {
    await render(<Bar defaultValue="home" />);
    await userEvent.hover(item('Search'));
    const layer = item('Search').element().querySelector('[data-wisp-state-layer]') as HTMLElement;
    await expect.poll(() => getComputedStyle(layer, '::before').opacity).toBe('0.08');
  });

  test('draws the focus ring inside the item', async () => {
    await render(<Bar defaultValue="home" />);
    await userEvent.tab();
    const style = getComputedStyle(item('Home').element());
    expect(style.outlineStyle).toBe('solid');
    expect(px(style.outlineOffset)).toBe(-3);
  });

  test('keeps the press ripple inside the pill', async () => {
    await render(<Bar defaultValue="home" />);
    const element = item('Search').element();
    const layer = element.querySelector('[data-wisp-state-layer]') as HTMLElement;
    element.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        buttons: 1,
        bubbles: true,
      }),
    );
    expect(layer).toHaveAttribute('data-pressed');
    expect(getComputedStyle(layer).overflow).toBe('hidden');
  });
});

test('lets a consumer swap the element, e.g. for a router link', async () => {
  const onClick = vi.fn();
  await render(
    <Bar defaultValue="x">
      <NavigationBarItem
        value="home"
        label="Home"
        icon={<Icon id="h" />}
        // biome-ignore lint/a11y/useValidAnchor: stands in for a client-side router link
        render={<a href="#home" className="router" onClick={onClick} />}
      />
    </Bar>,
  );
  const link = page.getByRole('link', { name: 'Home' });
  await expect.element(link).toHaveClass('router');
  await userEvent.click(link);
  expect(onClick).toHaveBeenCalledTimes(1);
  await expect.element(link).toHaveAttribute('aria-current', 'page');
});
