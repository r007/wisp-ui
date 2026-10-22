import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { List, ListItem } from '../list/list.js';
import { Search, type SearchProps } from './search.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
// The bar's wrapper is a search landmark; so is a docked view, but that is a popover.
const barInput = () =>
  document.querySelector('[role="search"]:not([popover]) input') as HTMLInputElement;
const bar = () => document.querySelector('[role="search"]:not([popover])') as HTMLElement;
const view = () => document.querySelector('[data-variant]') as HTMLElement;
const viewInput = () => view().querySelector('input') as HTMLInputElement;
const shown = () => view().matches(':popover-open, [open]');
const settled = () => expect.poll(() => style(view()).opacity).toBe('1');
const result = (name: string) =>
  Array.from(view().querySelectorAll<HTMLElement>('button')).find((el) =>
    el.textContent?.trim().startsWith(name),
  ) as HTMLElement;
const focused = () =>
  (document.activeElement as HTMLElement | null)?.getAttribute('aria-label') ??
  document.activeElement?.textContent?.trim();

/** The bar's room: inside the narrow test viewport, so focusing it never scrolls the page. */
const Spot = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '40px 24px', inlineSize: '100%', boxSizing: 'border-box' }}>
    {children}
  </div>
);

function Sample(props: Partial<SearchProps> & { onPick?: (name: string) => void }) {
  const { onPick, ...search } = props;
  return (
    <Spot>
      <Search aria-label="Search recipes" placeholder="Search recipes" {...search}>
        <List>
          <ListItem headline="Apple pie" onClick={() => onPick?.('Apple pie')} />
          <ListItem headline="Banana bread" onClick={() => onPick?.('Banana bread')} />
          <ListItem headline="Carrot cake" onClick={() => onPick?.('Carrot cake')} />
        </List>
      </Search>
    </Spot>
  );
}

const open = async () => {
  await userEvent.click(barInput());
  await expect.poll(shown).toBe(true);
};

test('starts as a plain search bar, with the view hidden', async () => {
  await render(<Sample />);
  await expect.element(page.getByRole('searchbox', { name: 'Search recipes' })).toBeVisible();
  expect(shown()).toBe(false);
});

test('leaves the layout while closed, so nothing invisible takes presses or is read', async () => {
  await render(<Sample />);
  expect(style(view()).display).toBe('none');
  expect(page.getByRole('searchbox').elements()).toHaveLength(1);
  await open();
  expect(style(view()).display).not.toBe('none');
});

test('a full-screen view is out of the layout while closed too', async () => {
  await render(<Sample variant="full-screen" />);
  expect(style(view()).display).toBe('none');
  expect(page.getByRole('searchbox').elements()).toHaveLength(1);
});

test('opens when the bar is pressed, and the view’s input takes focus', async () => {
  await render(<Sample />);
  await open();
  await expect.poll(() => document.activeElement).toBe(viewInput());
  expect(viewInput().placeholder).toBe('Search recipes');
});

test('opens on ArrowDown, and when the user types in the bar', async () => {
  const { unmount } = await render(<Sample />);
  barInput().focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.poll(shown).toBe(true);
  await unmount();

  await render(<Sample />);
  barInput().focus();
  await userEvent.keyboard('pie');
  await expect.poll(shown).toBe(true);
  expect(viewInput().value).toBe('pie');
});

test('shares its text between the bar and the view', async () => {
  await render(<Sample />);
  await open();
  await userEvent.type(viewInput(), 'cake');
  expect(barInput().value).toBe('cake');
});

test('closes on Escape and returns focus to the bar', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{Escape}');
  await expect.poll(shown).toBe(false);
  await expect.poll(() => document.activeElement).toBe(barInput());
});

test('closes on a press elsewhere, without taking focus back', async () => {
  await render(
    <>
      <Sample />
      {/* Below the open view, which can be 280px tall. */}
      <div style={{ paddingBlockStart: 400 }}>
        <button type="button">Elsewhere</button>
      </div>
    </>,
  );
  await open();
  await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }));
  await expect.poll(shown).toBe(false);
  await expect.element(page.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
});

test('closes from its back button', async () => {
  await render(<Sample />);
  await open();
  await userEvent.click(page.getByRole('button', { name: 'Close search' }));
  await expect.poll(shown).toBe(false);
  await expect.poll(() => document.activeElement).toBe(barInput());
});

test('searches on Enter with the text, then closes', async () => {
  const onSearch = vi.fn();
  await render(<Sample onSearch={onSearch} />);
  await open();
  await userEvent.type(viewInput(), 'tart{Enter}');
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch).toHaveBeenCalledWith('tart');
  await expect.poll(shown).toBe(false);
});

test('clears the text from a button that shows only when there is some', async () => {
  await render(<Sample />);
  await open();
  expect(page.getByRole('button', { name: 'Clear' }).elements()).toHaveLength(0);
  await userEvent.type(viewInput(), 'tart');
  await userEvent.click(page.getByRole('button', { name: 'Clear' }));
  expect(viewInput().value).toBe('');
  expect(barInput().value).toBe('');
  await expect.poll(() => document.activeElement).toBe(viewInput());
  expect(page.getByRole('button', { name: 'Clear' }).elements()).toHaveLength(0);
});

test('names the buttons as asked', async () => {
  await render(<Sample closeLabel="Back" clearLabel="Erase" defaultValue="x" defaultOpen />);
  await expect.poll(shown).toBe(true);
  await expect.element(page.getByRole('button', { name: 'Back' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Erase' })).toBeVisible();
});

test('moves between the input and the results with the arrow keys', async () => {
  await render(<Sample />);
  await open();
  await userEvent.keyboard('{ArrowDown}');
  expect(focused()).toBe('Apple pie');
  await userEvent.keyboard('{ArrowDown}');
  expect(focused()).toBe('Banana bread');
  await userEvent.keyboard('{End}');
  expect(focused()).toBe('Carrot cake');
  await userEvent.keyboard('{Home}');
  expect(focused()).toBe('Apple pie');
  await userEvent.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(viewInput());
});

test('runs a result’s action, then closes and returns focus to the bar', async () => {
  const onPick = vi.fn();
  await render(<Sample onPick={onPick} />);
  await open();
  await userEvent.click(result('Banana bread'));
  expect(onPick).toHaveBeenCalledWith('Banana bread');
  await expect.poll(shown).toBe(false);
  await expect.poll(() => document.activeElement).toBe(barInput());
});

test('stays open for a result marked data-keep-open', async () => {
  await render(
    <Spot>
      <Search aria-label="Search" defaultOpen>
        <button type="button" data-keep-open>
          Filters
        </button>
      </Search>
    </Spot>,
  );
  await expect.poll(shown).toBe(true);
  await userEvent.click(result('Filters'));
  expect(shown()).toBe(true);
});

test('can be controlled', async () => {
  const onOpenChange = vi.fn();
  const { rerender } = await render(<Sample open={false} onOpenChange={onOpenChange} />);
  await userEvent.click(barInput());
  expect(onOpenChange).toHaveBeenCalledWith(true);
  // The parent has not opened it.
  expect(shown()).toBe(false);
  await rerender(<Sample open onOpenChange={onOpenChange} />);
  await expect.poll(shown).toBe(true);
});

/** Upper-cases what is typed, to show that both inputs show what the parent says. */
function ControlledText() {
  const [value, setValue] = useState('pie');
  return <Sample value={value} onValueChange={(next) => setValue(next.toUpperCase())} />;
}

test('can have its text controlled', async () => {
  await render(<ControlledText />);
  expect(barInput().value).toBe('pie');
  await open();
  await userEvent.type(viewInput(), 'x');
  expect(viewInput().value).toBe('PIEX');
  expect(barInput().value).toBe('PIEX');
});

test('animates out before it is hidden, in every browser', async () => {
  const { rerender } = await render(<Sample open />);
  await settled();
  await rerender(<Sample open={false} />);
  expect(shown()).toBe(true);
  expect(view()).toHaveAttribute('data-closing');
  await expect.poll(shown).toBe(false);
});

test.describe('docked', () => {
  test('lies over the bar: same start, width and top', async () => {
    await render(<Sample open />);
    await settled();
    expect(Math.round(rect(view()).left)).toBe(Math.round(rect(bar()).left));
    expect(Math.round(rect(view()).width)).toBe(Math.round(rect(bar()).width));
    expect(Math.round(rect(view()).top)).toBe(Math.round(rect(bar()).top));
  });

  test('is a surface-container-high with 28px corners and a shadow, and grows with its results', async () => {
    await render(<Sample open />);
    await settled();
    // surface-container-high.
    expect(style(view()).backgroundColor).toBe('rgb(236, 230, 240)');
    expect(px(style(view()).borderTopLeftRadius)).toBe(28);
    expect(style(view()).boxShadow).not.toBe('none');
    expect(rect(view()).height).toBeGreaterThan(rect(bar()).height + 100);
  });

  test('has a 56px header, a rule under it, and its input where the bar’s was', async () => {
    await render(<Sample open />);
    await settled();
    const header = viewInput().parentElement as HTMLElement;
    expect(rect(header).height).toBe(56);
    const results = view().querySelector('ul')?.parentElement as HTMLElement;
    // outline.
    expect(style(results).borderTopColor).toBe('rgb(121, 116, 126)');
    expect(px(style(results).borderTopWidth)).toBe(1);
    expect(Math.round(rect(viewInput()).left)).toBe(Math.round(rect(barInput()).left));
  });

  test('has no results area without results', async () => {
    await render(
      <Spot>
        <Search aria-label="Search" open />
      </Spot>,
    );
    await settled();
    expect(view().querySelector('ul')).toBeNull();
    expect(rect(view()).height).toBe(56);
  });
});

test.describe('full-screen', () => {
  test('opens a modal dialog over the whole page', async () => {
    await render(<Sample variant="full-screen" />);
    expect(view().tagName).toBe('DIALOG');
    await open();
    await settled();
    expect(rect(view()).width).toBe(window.innerWidth);
    expect(rect(view()).height).toBe(window.innerHeight);
    expect(view().matches(':modal')).toBe(true);
    expect(px(style(view()).borderTopLeftRadius)).toBe(0);
  });

  test('has a 72px header', async () => {
    await render(<Sample variant="full-screen" open />);
    await settled();
    expect(rect(viewInput().parentElement as HTMLElement).height).toBe(72);
  });

  test('closes on Escape and returns focus to the bar', async () => {
    await render(<Sample variant="full-screen" />);
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.poll(shown).toBe(false);
    await expect.poll(() => document.activeElement).toBe(barInput());
  });

  test('moves into the results with ArrowDown, and a result closes it', async () => {
    const onPick = vi.fn();
    await render(<Sample variant="full-screen" onPick={onPick} />);
    await open();
    await userEvent.keyboard('{ArrowDown}');
    expect(focused()).toBe('Apple pie');
    await userEvent.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledWith('Apple pie');
    await expect.poll(shown).toBe(false);
  });
});
