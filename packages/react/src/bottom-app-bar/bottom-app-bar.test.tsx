import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Fab } from '../fab/fab.js';
import { IconButton } from '../icon-button/icon-button.js';
import { BottomAppBar } from './bottom-app-bar.js';

const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const bar = () => page.getByRole('toolbar').element() as HTMLElement;

const actions = (
  <>
    <IconButton aria-label="Search">
      <svg />
    </IconButton>
    <IconButton aria-label="Share">
      <svg />
    </IconButton>
  </>
);

test('is a toolbar named by its label', async () => {
  await render(<BottomAppBar aria-label="Actions">{actions}</BottomAppBar>);
  await expect.element(page.getByRole('toolbar', { name: 'Actions' })).toBeVisible();
});

test('is an 80px surface container with a shadow and square corners', async () => {
  await render(<BottomAppBar aria-label="Actions">{actions}</BottomAppBar>);
  // surface-container.
  expect(style(bar()).backgroundColor).toBe('rgb(243, 237, 247)');
  expect(rect(bar()).height).toBe(80);
  expect(style(bar()).boxShadow).not.toBe('none');
  expect(Number.parseFloat(style(bar()).borderTopLeftRadius)).toBe(0);
});

test('fills its container', async () => {
  await render(
    <div style={{ inlineSize: 400 }}>
      <BottomAppBar aria-label="Actions">{actions}</BottomAppBar>
    </div>,
  );
  expect(rect(bar()).width).toBe(400);
});

test('puts the actions at the start and the FAB at the end', async () => {
  await render(
    <div style={{ inlineSize: 400 }}>
      <BottomAppBar aria-label="Actions" fab={<Fab aria-label="Add" icon={<svg />} />}>
        {actions}
      </BottomAppBar>
    </div>,
  );
  const search = page.getByRole('button', { name: 'Search' }).element();
  const fab = page.getByRole('button', { name: 'Add' }).element();
  expect(rect(search).left).toBeLessThan(rect(fab).left);
  expect(Math.round(rect(bar()).right - rect(fab).right)).toBe(16);
  // Centred on the bar's height.
  expect(Math.round(rect(fab).top + rect(fab).height / 2)).toBe(
    Math.round(rect(bar()).top + rect(bar()).height / 2),
  );
});

test('has no FAB slot without a FAB', async () => {
  await render(<BottomAppBar aria-label="Actions">{actions}</BottomAppBar>);
  expect(page.getByRole('button').elements()).toHaveLength(2);
});

test('sticks to the bottom of its scroll container when asked', async () => {
  await render(
    <div style={{ blockSize: 200, overflow: 'auto' }} data-testid="scroller">
      <div style={{ blockSize: 600 }}>Content</div>
      <BottomAppBar aria-label="Actions" sticky>
        {actions}
      </BottomAppBar>
    </div>,
  );
  const scroller = page.getByTestId('scroller').element();
  expect(style(bar()).position).toBe('sticky');
  expect(Math.round(rect(bar()).bottom)).toBe(Math.round(rect(scroller).bottom));
});

test('forwards a ref and props', async () => {
  let node: HTMLDivElement | null = null;
  await render(
    <BottomAppBar
      aria-label="Actions"
      data-testid="bar"
      ref={(el) => {
        node = el;
      }}
    >
      {actions}
    </BottomAppBar>,
  );
  expect(node).toBe(page.getByTestId('bar').element());
});
