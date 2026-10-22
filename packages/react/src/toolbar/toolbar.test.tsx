import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Fab } from '../fab/fab.js';
import { IconButton } from '../icon-button/icon-button.js';
import { Toolbar } from './toolbar.js';

const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const toolbar = () => page.getByRole('toolbar').element() as HTMLElement;

const Buttons = () => (
  <>
    <IconButton aria-label="Bold">
      <svg />
    </IconButton>
    <IconButton aria-label="Italic">
      <svg />
    </IconButton>
    <IconButton aria-label="Underline">
      <svg />
    </IconButton>
  </>
);

test('is a toolbar named by its label', async () => {
  await render(
    <Toolbar aria-label="Text formatting">
      <Buttons />
    </Toolbar>,
  );
  await expect.element(page.getByRole('toolbar', { name: 'Text formatting' })).toBeVisible();
});

test('docked is a square-cornered 64px surface container', async () => {
  await render(
    <Toolbar aria-label="Tools">
      <Buttons />
    </Toolbar>,
  );
  // surface-container, on-surface-variant.
  expect(style(toolbar()).backgroundColor).toBe('rgb(243, 237, 247)');
  expect(rect(toolbar()).height).toBeGreaterThanOrEqual(64);
  expect(Number.parseFloat(style(toolbar()).borderTopLeftRadius)).toBe(0);
  expect(style(toolbar()).boxShadow).toBe('none');
});

test('floating is a shadowed pill', async () => {
  await render(
    <Toolbar aria-label="Tools" variant="floating">
      <Buttons />
    </Toolbar>,
  );
  expect(rect(toolbar()).height).toBe(64);
  expect(Number.parseFloat(style(toolbar()).borderTopLeftRadius)).toBeGreaterThanOrEqual(32);
  expect(style(toolbar()).boxShadow).not.toBe('none');
});

test('vibrant is a primary container', async () => {
  await render(
    <Toolbar aria-label="Tools" scheme="vibrant">
      <Buttons />
    </Toolbar>,
  );
  // primary-container.
  expect(style(toolbar()).backgroundColor).toBe('rgb(234, 221, 255)');
});

test('gives its icon buttons its icon colour', async () => {
  await render(
    <Toolbar aria-label="Tools" scheme="vibrant">
      <Buttons />
    </Toolbar>,
  );
  // on-primary-container.
  expect(style(page.getByRole('button', { name: 'Bold' }).element()).color).toBe(
    'rgb(79, 55, 139)',
  );
});

test('gives a toggled icon button the selected container', async () => {
  await render(
    <Toolbar aria-label="Tools">
      <IconButton aria-label="Bold" selected>
        <svg />
      </IconButton>
      <IconButton aria-label="Italic" selected={false}>
        <svg />
      </IconButton>
    </Toolbar>,
  );
  // secondary-container.
  expect(style(page.getByRole('button', { name: 'Bold' }).element()).backgroundColor).toBe(
    'rgb(232, 222, 248)',
  );
  expect(style(page.getByRole('button', { name: 'Italic' }).element()).backgroundColor).toBe(
    'rgba(0, 0, 0, 0)',
  );
});

test('a vertical floating toolbar stands on end', async () => {
  await render(
    <Toolbar aria-label="Tools" variant="floating" orientation="vertical">
      <Buttons />
    </Toolbar>,
  );
  expect(toolbar().getAttribute('aria-orientation')).toBe('vertical');
  const first = page.getByRole('button', { name: 'Bold' }).element();
  const second = page.getByRole('button', { name: 'Italic' }).element();
  expect(rect(second).top).toBeGreaterThan(rect(first).bottom - 1);
  expect(Math.round(rect(first).left)).toBe(Math.round(rect(second).left));
});

test('an orientation only applies to a floating toolbar', async () => {
  await render(
    <Toolbar aria-label="Tools" orientation="vertical">
      <Buttons />
    </Toolbar>,
  );
  expect(toolbar().getAttribute('aria-orientation')).toBe('horizontal');
});

test('is one tab stop', async () => {
  await render(
    <>
      <button type="button">Before</button>
      <Toolbar aria-label="Tools">
        <Buttons />
      </Toolbar>
      <button type="button">After</button>
    </>,
  );
  const tabindexes = page
    .getByRole('toolbar')
    .getByRole('button')
    .elements()
    .map((el) => el.getAttribute('tabindex'));
  expect(tabindexes).toEqual(['0', '-1', '-1']);

  (page.getByRole('button', { name: 'Before' }).element() as HTMLElement).focus();
  // Firefox applies the focus change a moment after the key press resolves.
  await userEvent.tab();
  await expect
    .poll(() => document.activeElement)
    .toBe(page.getByRole('button', { name: 'Bold' }).element());
  await userEvent.tab();
  await expect
    .poll(() => document.activeElement)
    .toBe(page.getByRole('button', { name: 'After' }).element());
});

test('the arrow keys move between the controls, wrapping, and Home and End jump', async () => {
  await render(
    <Toolbar aria-label="Tools">
      <Buttons />
    </Toolbar>,
  );
  const bold = page.getByRole('button', { name: 'Bold' }).element() as HTMLElement;
  bold.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(page.getByRole('button', { name: 'Italic' }).element());
  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(page.getByRole('button', { name: 'Underline' }).element());
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(bold);
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(page.getByRole('button', { name: 'Underline' }).element());
  await userEvent.keyboard('{Home}');
  expect(document.activeElement).toBe(bold);
});

test('the focused control is the tab stop', async () => {
  await render(
    <Toolbar aria-label="Tools">
      <Buttons />
    </Toolbar>,
  );
  (page.getByRole('button', { name: 'Italic' }).element() as HTMLElement).focus();
  const tabindexes = page
    .getByRole('button')
    .elements()
    .map((el) => el.getAttribute('tabindex'));
  expect(tabindexes).toEqual(['-1', '0', '-1']);
});

test('a vertical toolbar uses the up and down arrows', async () => {
  await render(
    <Toolbar aria-label="Tools" variant="floating" orientation="vertical">
      <Buttons />
    </Toolbar>,
  );
  (page.getByRole('button', { name: 'Bold' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(page.getByRole('button', { name: 'Bold' }).element());
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(page.getByRole('button', { name: 'Italic' }).element());
  await userEvent.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(page.getByRole('button', { name: 'Bold' }).element());
});

test('the arrows follow the reading direction in a right-to-left page', async () => {
  await render(
    <div dir="rtl">
      <Toolbar aria-label="Tools">
        <Buttons />
      </Toolbar>
    </div>,
  );
  (page.getByRole('button', { name: 'Bold' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(page.getByRole('button', { name: 'Italic' }).element());
});

test('skips a disabled control', async () => {
  await render(
    <Toolbar aria-label="Tools">
      <IconButton aria-label="Bold">
        <svg />
      </IconButton>
      <IconButton aria-label="Italic" disabled>
        <svg />
      </IconButton>
      <IconButton aria-label="Underline">
        <svg />
      </IconButton>
    </Toolbar>,
  );
  (page.getByRole('button', { name: 'Bold' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(page.getByRole('button', { name: 'Underline' }).element());
});

test('seats a FAB beside a floating toolbar, 8px away', async () => {
  await render(
    <Toolbar aria-label="Tools" variant="floating" fab={<Fab aria-label="Add" icon={<svg />} />}>
      <Buttons />
    </Toolbar>,
  );
  const fab = page.getByRole('button', { name: 'Add' }).element();
  expect(Math.round(rect(fab).left - rect(toolbar()).right)).toBe(8);
});

test('a FAB is shown only beside a floating toolbar', async () => {
  await render(
    <Toolbar aria-label="Tools" fab={<Fab aria-label="Add" icon={<svg />} />}>
      <Buttons />
    </Toolbar>,
  );
  expect(page.getByRole('button', { name: 'Add' }).elements()).toHaveLength(0);
});

test('forwards a ref and props', async () => {
  let node: HTMLDivElement | null = null;
  await render(
    <Toolbar
      aria-label="Tools"
      data-testid="bar"
      ref={(el) => {
        node = el;
      }}
    >
      <Buttons />
    </Toolbar>,
  );
  expect(node).toBe(page.getByTestId('bar').element());
});
