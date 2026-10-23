'use client';

import {
  applyColorScheme,
  COLOR_SCHEME_STORAGE_KEY,
  type ColorScheme,
  readColorScheme,
  storeColorScheme,
} from '@wisp-ui/tokens';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

export interface ColorSchemeState {
  /** The choice: `light`, `dark`, or `system` to follow the operating system. */
  scheme: ColorScheme;
  /** What is shown: `scheme`, or what the system asks for when `scheme` is `system`. */
  resolved: 'light' | 'dark';
  /** Makes the choice, applies it to the page and remembers it. */
  setScheme: (scheme: ColorScheme) => void;
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

/** A choice storage would not keep (blocked site data): held here for as long as the page lives. */
let unstored: ColorScheme | undefined;

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === COLOR_SCHEME_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  // The system changed its mind.
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
    media.removeEventListener('change', callback);
  };
}

const getScheme = (): ColorScheme => unstored ?? readColorScheme();
const getSystemDark = () => window.matchMedia(DARK_QUERY).matches;

/**
 * Light and dark mode for a page: the current choice, what that comes to, and a way to change it.
 * The choice is remembered in `localStorage` and applied to the page (`color-scheme` on `<html>`),
 * which every colour of the library follows. Until it is changed it is `system`.
 *
 * ```tsx
 * const { scheme, setScheme } = useColorScheme();
 * <Switch checked={scheme === 'dark'} onChange={(e) => setScheme(e.target.checked ? 'dark' : 'light')} />
 * ```
 *
 * To avoid a flash of the wrong theme before React runs, also put `colorSchemeScript` inline in
 * the document's `<head>`.
 */
export function useColorScheme(): ColorSchemeState {
  // On the server nothing is known: `system`, and light, until the page takes over.
  const scheme = useSyncExternalStore(subscribe, getScheme, () => 'system' as const);
  const systemDark = useSyncExternalStore(subscribe, getSystemDark, () => false);

  useEffect(() => {
    applyColorScheme(scheme);
  }, [scheme]);

  const setScheme = useCallback((next: ColorScheme) => {
    unstored = storeColorScheme(next) ? undefined : next;
    applyColorScheme(next);
    notify();
  }, []);

  const resolved = scheme === 'system' ? (systemDark ? 'dark' : 'light') : scheme;
  return { scheme, resolved, setScheme };
}
