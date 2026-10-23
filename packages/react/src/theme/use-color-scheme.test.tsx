import { COLOR_SCHEME_STORAGE_KEY, colorSchemeScript } from '@wisp-ui/tokens';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useColorScheme } from './use-color-scheme.js';

function Probe() {
  const { scheme, resolved, setScheme } = useColorScheme();
  return (
    <div>
      <output data-testid="scheme">{scheme}</output>
      <output data-testid="resolved">{resolved}</output>
      <button type="button" onClick={() => setScheme('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setScheme('light')}>
        Light
      </button>
      <button type="button" onClick={() => setScheme('system')}>
        System
      </button>
    </div>
  );
}

const root = document.documentElement;
const text = (id: string) => document.querySelector(`[data-testid="${id}"]`)?.textContent;

/** Makes the system ask for dark (or light), and returns a function to change its mind. */
function systemPrefers(dark: boolean) {
  let matches = dark;
  const listeners = new Set<() => void>();
  const spy = vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        get matches() {
          return query.includes('prefers-color-scheme: dark') ? matches : false;
        },
        media: query,
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  );
  return {
    spy,
    change(next: boolean) {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
}

beforeEach(() => {
  localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
  root.style.removeProperty('color-scheme');
  delete root.dataset.wispColorScheme;
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
  root.style.removeProperty('color-scheme');
  delete root.dataset.wispColorScheme;
});

test('follows the system until it is told otherwise', async () => {
  systemPrefers(true);
  await render(<Probe />);
  expect(text('scheme')).toBe('system');
  expect(text('resolved')).toBe('dark');
  expect(root.style.colorScheme).toBe('');
});

test('follows the system when it changes its mind', async () => {
  const system = systemPrefers(false);
  await render(<Probe />);
  expect(text('resolved')).toBe('light');
  system.change(true);
  await expect.poll(() => text('resolved')).toBe('dark');
});

test('a choice is applied to the page, remembered, and resolved to itself', async () => {
  systemPrefers(false);
  await render(<Probe />);
  await page.getByRole('button', { name: 'Dark' }).click();
  expect(text('scheme')).toBe('dark');
  expect(text('resolved')).toBe('dark');
  expect(root.style.colorScheme).toBe('dark');
  expect(root.dataset.wispColorScheme).toBe('dark');
  expect(localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('dark');
});

test('the colours really flip with it', async () => {
  await render(<Probe />);
  const surface = () => getComputedStyle(root).getPropertyValue('--md-sys-color-surface').trim();
  const colour = () => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--md-sys-color-surface)';
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  };
  expect(surface()).toMatch(/^light-dark\(/);
  await page.getByRole('button', { name: 'Light' }).click();
  const light = colour();
  await page.getByRole('button', { name: 'Dark' }).click();
  const dark = colour();
  expect(light).not.toBe(dark);
});

test('system takes the choice off again', async () => {
  await render(<Probe />);
  await page.getByRole('button', { name: 'Dark' }).click();
  await page.getByRole('button', { name: 'System' }).click();
  expect(text('scheme')).toBe('system');
  expect(root.style.colorScheme).toBe('');
  expect(localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBeNull();
});

test('starts from what was remembered', async () => {
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
  await render(<Probe />);
  expect(text('scheme')).toBe('dark');
  await expect.poll(() => root.style.colorScheme).toBe('dark');
});

test('follows another tab', async () => {
  await render(<Probe />);
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
  window.dispatchEvent(new StorageEvent('storage', { key: COLOR_SCHEME_STORAGE_KEY }));
  await expect.poll(() => text('scheme')).toBe('dark');
});

test('two users of the hook stay in step', async () => {
  await render(
    <>
      <Probe />
      <Probe />
    </>,
  );
  await page.getByRole('button', { name: 'Dark' }).first().click();
  const schemes = [...document.querySelectorAll('[data-testid="scheme"]')].map(
    (el) => el.textContent,
  );
  expect(schemes).toEqual(['dark', 'dark']);
});

test('keeps the choice for the life of the page when storage will not', async () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  await render(<Probe />);
  await page.getByRole('button', { name: 'Dark' }).click();
  expect(text('scheme')).toBe('dark');
  expect(root.style.colorScheme).toBe('dark');
  setItem.mockRestore();
  // A later choice that storage takes replaces it.
  await page.getByRole('button', { name: 'Light' }).click();
  expect(text('scheme')).toBe('light');
  expect(localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('light');
});

test('the head script gives the same page the hook would', async () => {
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
  new Function(colorSchemeScript)();
  expect(root.style.colorScheme).toBe('dark');
  expect(root.dataset.wispColorScheme).toBe('dark');
});
