import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Tab, TabList, type TabListProps, TabPanel, Tabs, type TabsProps } from './tabs.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const tab = (name: string) => page.getByRole('tab', { name }).element() as HTMLElement;
const list = () => page.getByRole('tablist').element() as HTMLElement;
const indicator = () => list().lastElementChild as HTMLElement;
const content = (name: string) => tab(name).querySelector('[data-slot="content"]') as HTMLElement;
const focused = () => document.activeElement?.textContent?.trim();

function Sample({
  list: listProps,
  ...tabs
}: Partial<TabsProps> & { list?: Partial<TabListProps> }) {
  return (
    <Tabs defaultValue="flights" {...tabs}>
      <TabList aria-label="Trips" {...listProps}>
        <Tab value="flights">Flights</Tab>
        <Tab value="hotels">Hotels</Tab>
        <Tab value="cars" disabled>
          Cars
        </Tab>
        <Tab value="trains">Trains</Tab>
      </TabList>
      <TabPanel value="flights">Flight deals</TabPanel>
      <TabPanel value="hotels">Hotel deals</TabPanel>
      <TabPanel value="cars">Car deals</TabPanel>
      <TabPanel value="trains">Train deals</TabPanel>
    </Tabs>
  );
}

test('is a named tab list whose selected tab shows its panel', async () => {
  await render(<Sample />);
  await expect.element(page.getByRole('tablist', { name: 'Trips' })).toBeVisible();
  await expect
    .element(page.getByRole('tab', { name: 'Flights' }))
    .toHaveAttribute('aria-selected', 'true');
  await expect
    .element(page.getByRole('tab', { name: 'Hotels' }))
    .toHaveAttribute('aria-selected', 'false');
  await expect
    .element(page.getByRole('tabpanel', { name: 'Flights' }))
    .toHaveTextContent('Flight deals');
  expect(page.getByRole('tabpanel').elements()).toHaveLength(1);
});

test('ties each tab to its panel', async () => {
  await render(<Sample />);
  const panel = page.getByRole('tabpanel').element();
  expect(tab('Flights').getAttribute('aria-controls')).toBe(panel.id);
  expect(panel.getAttribute('aria-labelledby')).toBe(tab('Flights').id);
});

test('selects on click, and reports it', async () => {
  const onValueChange = vi.fn();
  await render(<Sample onValueChange={onValueChange} />);
  await userEvent.click(tab('Hotels'));
  await expect
    .element(page.getByRole('tabpanel', { name: 'Hotels' }))
    .toHaveTextContent('Hotel deals');
  expect(tab('Hotels')).toHaveAttribute('aria-selected', 'true');
  expect(onValueChange).toHaveBeenCalledWith('hotels');
});

test('does not select a disabled tab', async () => {
  await render(<Sample />);
  await userEvent.click(tab('Cars'), { force: true });
  expect(tab('Cars')).toHaveAttribute('aria-selected', 'false');
});

/** Turns a request for "trains" into "flights", to show the parent has the last word. */
function RedirectingTabs() {
  const [value, setValue] = useState('hotels');
  return (
    <Sample
      value={value}
      onValueChange={(next) => setValue(next === 'trains' ? 'flights' : next)}
    />
  );
}

test('can be controlled', async () => {
  await render(<RedirectingTabs />);
  expect(tab('Hotels')).toHaveAttribute('aria-selected', 'true');
  await userEvent.click(tab('Trains'));
  // The parent turned "trains" into "flights".
  expect(tab('Flights')).toHaveAttribute('aria-selected', 'true');
});

test.describe('keyboard', () => {
  test('puts only the selected tab in the tab order', async () => {
    await render(
      <>
        <button type="button">Before</button>
        <Sample />
      </>,
    );
    expect(tab('Flights')).toHaveAttribute('tabindex', '0');
    expect(tab('Hotels')).toHaveAttribute('tabindex', '-1');
    // Tab goes from the control before straight to the selected tab, past the others.
    page.getByRole('button', { name: 'Before' }).element().focus();
    await userEvent.tab();
    expect(focused()).toBe('Flights');
    await userEvent.tab();
    // Next is the panel, not another tab.
    expect(document.activeElement).toBe(page.getByRole('tabpanel').element());
  });

  test('moves with the arrow keys, wrapping and skipping disabled tabs, selecting as it goes', async () => {
    await render(<Sample />);
    tab('Flights').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('Hotels');
    expect(tab('Hotels')).toHaveAttribute('aria-selected', 'true');
    // "Cars" is disabled.
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('Trains');
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('Flights');
    await userEvent.keyboard('{ArrowLeft}');
    expect(focused()).toBe('Trains');
  });

  test('jumps with Home and End', async () => {
    await render(<Sample />);
    tab('Flights').focus();
    await userEvent.keyboard('{End}');
    expect(focused()).toBe('Trains');
    await userEvent.keyboard('{Home}');
    expect(focused()).toBe('Flights');
  });

  test('with manual activation focus moves first and Enter selects', async () => {
    await render(<Sample activation="manual" />);
    tab('Flights').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('Hotels');
    expect(tab('Hotels')).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{Enter}');
    expect(tab('Hotels')).toHaveAttribute('aria-selected', 'true');
  });

  test('flips the arrows in right-to-left layouts', async () => {
    await render(
      <div dir="rtl">
        <Sample />
      </div>,
    );
    tab('Flights').focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(focused()).toBe('Hotels');
  });

  test('draws the focus ring inside the focused tab', async () => {
    await render(
      <>
        <button type="button">Before</button>
        <Sample />
      </>,
    );
    page.getByRole('button', { name: 'Before' }).element().focus();
    await userEvent.tab();
    expect(style(tab('Flights')).outlineStyle).toBe('solid');
    expect(px(style(tab('Flights')).outlineWidth)).toBe(3);
    expect(px(style(tab('Flights')).outlineOffset)).toBe(-3);
  });
});

test.describe('primary', () => {
  test('is a 48px surface row with title-small labels', async () => {
    await render(<Sample />);
    expect(rect(tab('Flights')).height).toBe(48);
    expect(style(list()).backgroundColor).toBe('rgb(254, 247, 255)');
    expect(style(tab('Flights')).fontSize).toBe('14px');
  });

  test('shares the width equally between tabs', async () => {
    await render(<Sample />);
    const widths = ['Flights', 'Hotels', 'Cars', 'Trains'].map((name) => rect(tab(name)).width);
    expect(new Set(widths.map(Math.round)).size).toBe(1);
  });

  test('colours the selected label primary and the others on-surface-variant', async () => {
    await render(<Sample />);
    expect(style(tab('Flights')).color).toBe('rgb(103, 80, 164)');
    expect(style(tab('Hotels')).color).toBe('rgb(73, 69, 79)');
  });

  test('darkens an inactive label on hover', async () => {
    await render(<Sample />);
    await userEvent.hover(tab('Hotels'));
    await expect.poll(() => style(tab('Hotels')).color).toBe('rgb(29, 27, 32)');
  });

  test('draws a 3px indicator as wide as the selected tab’s content, with a rounded top', async () => {
    await render(<Sample />);
    // It animates from nothing to the tab's content.
    await expect
      .poll(() => Math.round(rect(indicator()).width))
      .toBe(Math.round(rect(content('Flights')).width));
    expect(rect(indicator()).height).toBe(3);
    expect(Math.round(rect(indicator()).left)).toBe(Math.round(rect(content('Flights')).left));
    expect(Math.round(rect(indicator()).bottom)).toBe(Math.round(rect(list()).bottom));
    expect(px(style(indicator()).borderTopLeftRadius)).toBe(3);
    expect(px(style(indicator()).borderBottomLeftRadius)).toBe(0);
    expect(style(indicator()).backgroundColor).toBe('rgb(103, 80, 164)');
  });

  test('slides the indicator to the selected tab', async () => {
    await render(<Sample />);
    await userEvent.click(tab('Hotels'));
    // Within a pixel, not equal once rounded: two positions a fraction apart can round either way
    // across a .5, and where that falls depends on how wide the page the test runs in is.
    await expect
      .poll(() => Math.abs(rect(indicator()).left - rect(content('Hotels')).left))
      .toBeLessThan(1);
    expect(Math.abs(rect(indicator()).width - rect(content('Hotels')).width)).toBeLessThan(1);
  });

  test('stacks an icon above the label in a 64px tab', async () => {
    await render(
      <Tabs defaultValue="a">
        <TabList aria-label="x">
          <Tab value="a" icon={<svg data-testid="i" />}>
            Alpha
          </Tab>
          <Tab value="b">Beta</Tab>
        </TabList>
      </Tabs>,
    );
    expect(rect(tab('Alpha')).height).toBe(64);
    expect(rect(page.getByTestId('i').element()).width).toBe(24);
    expect(rect(page.getByTestId('i').element()).bottom).toBeLessThanOrEqual(
      rect(page.getByText('Alpha').element()).top + 1,
    );
  });

  test('mirrors the indicator in right-to-left layouts', async () => {
    await render(
      <div dir="rtl">
        <Sample />
      </div>,
    );
    // The first tab is at the right; the indicator slides in under its content.
    await expect
      .poll(() => Math.round(rect(indicator()).right))
      .toBe(Math.round(rect(content('Flights')).right));
  });
});

test.describe('secondary', () => {
  test('draws a 2px indicator as wide as the whole tab', async () => {
    await render(<Sample list={{ variant: 'secondary' }} />);
    await expect
      .poll(() => Math.round(rect(indicator()).width))
      .toBe(Math.round(rect(tab('Flights')).width));
    expect(rect(indicator()).height).toBe(2);
    expect(px(style(indicator()).borderTopLeftRadius)).toBe(0);
  });

  test('colours the selected label on-surface', async () => {
    await render(<Sample list={{ variant: 'secondary' }} />);
    expect(style(tab('Flights')).color).toBe('rgb(29, 27, 32)');
    expect(style(tab('Hotels')).color).toBe('rgb(73, 69, 79)');
  });
});

test('scrollable tabs take their content’s width, at least 90px, and the list scrolls', async () => {
  await render(
    <div style={{ inlineSize: 200 }}>
      <Sample list={{ scrollable: true }} />
    </div>,
  );
  expect(rect(tab('Flights')).width).toBeGreaterThanOrEqual(90);
  expect(list().scrollWidth).toBeGreaterThan(list().clientWidth);
});

test.describe('mouse wheel', () => {
  /** Dispatches a wheel event; `false` means the handler took it (called `preventDefault`). */
  const wheel = (init: WheelEventInit) =>
    list().dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init }));

  const renderNarrow = () =>
    render(
      <div style={{ inlineSize: 200 }}>
        <Sample list={{ scrollable: true }} />
      </div>,
    );

  test('a vertical wheel scrolls a scrollable list sideways', async () => {
    await renderNarrow();
    list().scrollLeft = 0;
    expect(wheel({ deltaY: 100 })).toBe(false);
    await expect.poll(() => list().scrollLeft).toBe(100);
    expect(wheel({ deltaY: -40 })).toBe(false);
    await expect.poll(() => list().scrollLeft).toBe(60);
  });

  test('leaves the wheel to the page at either end of the list', async () => {
    await renderNarrow();
    list().scrollLeft = 0;
    expect(wheel({ deltaY: -100 })).toBe(true);
    list().scrollLeft = list().scrollWidth;
    expect(wheel({ deltaY: 100 })).toBe(true);
  });

  test('leaves a horizontal gesture to the browser', async () => {
    await renderNarrow();
    list().scrollLeft = 0;
    expect(wheel({ deltaX: 100, deltaY: 10 })).toBe(true);
    expect(list().scrollLeft).toBe(0);
  });

  test('leaves the wheel alone when everything fits', async () => {
    await render(<Sample />);
    expect(wheel({ deltaY: 100 })).toBe(true);
  });
});

test('shows the press ripple', async () => {
  await render(<Sample />);
  tab('Hotels').dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      buttons: 1,
      bubbles: true,
    }),
  );
  expect(tab('Hotels').querySelector('[data-wisp-state-layer]')).toHaveAttribute('data-pressed');
});
