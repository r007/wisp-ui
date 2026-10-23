/**
 * The site's own theme: which colour, and light or dark. Both are remembered. The colour is a preset
 * (its id, which a stylesheet turns into a palette before the first paint) or a `#rrggbb` the visitor
 * chose, which is turned into a palette here.
 */

import { applyTheme, type ColorScheme, useColorScheme } from '@wisp-ui/react/theme';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_SEED, SEED_STORAGE_KEY, SEEDS } from '../scripts/seeds.js';

const listeners = new Set<() => void>();
let removeCustom: (() => void) | undefined;
/** A choice storage would not keep: held for the life of the page. */
let unstored: string | undefined;

function readSeed(): string {
  if (unstored) return unstored;
  try {
    return localStorage.getItem(SEED_STORAGE_KEY) ?? DEFAULT_SEED;
  } catch {
    return DEFAULT_SEED;
  }
}

/** Puts the chosen colour on the page. */
function applySeed(seed: string) {
  const root = document.documentElement;
  removeCustom?.();
  removeCustom = undefined;
  if (SEEDS.some((s) => s.id === seed)) {
    root.setAttribute('data-wisp-seed', seed);
  } else if (/^#[0-9a-f]{6}$/i.test(seed)) {
    // An unlayered rule per role, set on the element itself: it wins over the presets.
    removeCustom = applyTheme(root, seed);
  }
}

export interface SiteTheme {
  /** A preset's id, or a `#rrggbb` colour. */
  seed: string;
  setSeed: (seed: string) => void;
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
  resolved: 'light' | 'dark';
}

export function useSiteTheme(): SiteTheme {
  const seed = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    readSeed,
    () => DEFAULT_SEED,
  );
  const { scheme, setScheme, resolved } = useColorScheme();

  useEffect(() => {
    applySeed(seed);
  }, [seed]);

  const setSeed = useCallback((next: string) => {
    try {
      localStorage.setItem(SEED_STORAGE_KEY, next);
      unstored = undefined;
    } catch {
      unstored = next;
    }
    applySeed(next);
    for (const listener of listeners) listener();
  }, []);

  return { seed, setSeed, scheme, setScheme, resolved };
}
