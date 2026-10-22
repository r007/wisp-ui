import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { IconButton } from '../icon-button/icon-button.js';
import { SearchBar } from './search-bar.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const input = () => page.getByRole('searchbox').element() as HTMLInputElement;
const bar = () => page.getByRole('search').element() as HTMLElement;

test('is a search landmark with a named search box', async () => {
  await render(<SearchBar aria-label="Search recipes" placeholder="Search recipes" />);
  await expect.element(page.getByRole('search')).toBeVisible();
  await expect.element(page.getByRole('searchbox', { name: 'Search recipes' })).toBeVisible();
  expect(input().placeholder).toBe('Search recipes');
});

test('is a 56px pill on surface-container-high with a shadow', async () => {
  await render(<SearchBar aria-label="Search" />);
  // surface-container-high.
  expect(style(bar()).backgroundColor).toBe('rgb(236, 230, 240)');
  expect(rect(bar()).height).toBe(56);
  expect(px(style(bar()).borderTopLeftRadius)).toBeGreaterThanOrEqual(28);
  expect(style(bar()).boxShadow).not.toBe('none');
});

test('fills the width it is given', async () => {
  await render(
    <div style={{ inlineSize: 420 }}>
      <SearchBar aria-label="Search" />
    </div>,
  );
  expect(rect(bar()).width).toBe(420);
});

test('shows a 24px magnifier 16px from the start, and 16px before the text', async () => {
  await render(<SearchBar aria-label="Search" />);
  const icon = bar().querySelector('svg') as SVGElement;
  expect(rect(icon).width).toBe(24);
  expect(Math.round(rect(icon).left - rect(bar()).left)).toBe(16);
  expect(Math.round(rect(input()).left - rect(icon).right)).toBe(16);
  // The magnifier is decoration.
  expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
});

test('takes a different leading icon, or none', async () => {
  const { rerender } = await render(
    <SearchBar aria-label="Search" leading={<svg data-testid="mine" />} />,
  );
  expect(page.getByTestId('mine').element()).toBeInTheDocument();
  await rerender(<SearchBar aria-label="Search" leading={null} />);
  expect(bar().querySelector('svg')).toBeNull();
  expect(Math.round(rect(input()).left - rect(bar()).left)).toBe(16);
});

test('types the text in body-large, with a quiet placeholder', async () => {
  await render(<SearchBar aria-label="Search" placeholder="Search recipes" defaultValue="pie" />);
  // on-surface; body-large.
  expect(style(input()).color).toBe('rgb(29, 27, 32)');
  expect(style(input()).fontSize).toBe('16px');
  expect(style(input()).lineHeight).toBe('24px');
  // on-surface-variant.
  expect(style(input(), '::placeholder').color).toBe('rgb(73, 69, 79)');
});

test('keeps text in an input of its own, controlled or not', async () => {
  await render(<SearchBar aria-label="Search" />);
  await userEvent.type(input(), 'soup');
  expect(input().value).toBe('soup');
});

const onValueChange = vi.fn();

/** Upper-cases what is typed, to show that the bar shows what the parent says. */
function Controlled() {
  const [value, setValue] = useState('');
  return (
    <SearchBar
      aria-label="Search"
      value={value}
      onValueChange={(next) => {
        onValueChange(next);
        setValue(next.toUpperCase());
      }}
    />
  );
}

test('reports each change, and can be controlled', async () => {
  await render(<Controlled />);
  await userEvent.type(input(), 'ab');
  expect(onValueChange).toHaveBeenLastCalledWith('Ab');
  expect(input().value).toBe('AB');
});

test('searches on Enter, with the text', async () => {
  const onSearch = vi.fn();
  await render(<SearchBar aria-label="Search" onSearch={onSearch} />);
  await userEvent.type(input(), 'pasta{Enter}');
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch).toHaveBeenCalledWith('pasta');
});

test('puts its actions at the end, 16px from the text', async () => {
  await render(
    <div style={{ inlineSize: 420 }}>
      <SearchBar
        aria-label="Search"
        trailing={
          <IconButton aria-label="Voice search">
            <svg />
          </IconButton>
        }
      />
    </div>,
  );
  const action = page.getByRole('button', { name: 'Voice search' }).element();
  expect(rect(action).left).toBeGreaterThan(rect(input()).right - 1);
  expect(Math.round(rect(action).left - rect(input()).right)).toBe(16);
  // An icon button takes no container of its own from the bar.
  expect(style(action).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  // The icon button reads on-surface-variant, the bar's trailing icon colour.
  expect(style(action).color).toBe('rgb(73, 69, 79)');
});

test('has no gap for actions when it has none', async () => {
  await render(
    <div style={{ inlineSize: 420 }}>
      <SearchBar aria-label="Search" />
    </div>,
  );
  expect(Math.round(rect(bar()).right - rect(input()).right)).toBe(16);
});

test('tints the whole bar on hover', async () => {
  await render(<SearchBar aria-label="Search" />);
  const tint = () => style(bar(), '::before').opacity;
  expect(tint()).toBe('0');
  await userEvent.hover(bar());
  await expect.poll(tint).toBe('0.08');
});

test('rings the bar when the input is focused', async () => {
  await render(<SearchBar aria-label="Search" />);
  expect(style(bar()).outlineStyle).toBe('none');
  input().focus();
  await expect.poll(() => style(bar()).outlineStyle).toBe('solid');
  expect(px(style(bar()).outlineWidth)).toBe(3);
  expect(px(style(bar()).outlineOffset)).toBe(2);
});

test('forwards a ref and props to the input', async () => {
  let node: HTMLInputElement | null = null;
  await render(
    <SearchBar
      aria-label="Search"
      name="q"
      ref={(el) => {
        node = el;
      }}
    />,
  );
  expect(node).toBe(input());
  expect(input().name).toBe('q');
  expect(input().type).toBe('search');
});
