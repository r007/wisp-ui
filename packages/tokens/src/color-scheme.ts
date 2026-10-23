/**
 * Light and dark mode. The colour roles are `light-dark()` pairs, so they follow the CSS
 * `color-scheme` of the element they are used on: by default the system's (`light dark`, set by
 * `theme.css`), and any element can be made one or the other by setting its own. These helpers
 * set it, remember the choice, and apply it before the first paint so a page does not flash the
 * wrong theme.
 */

/** `system` follows the operating system's setting, which is what a page does until it is told otherwise. */
export type ColorScheme = 'light' | 'dark' | 'system';

/** The `localStorage` key the choice is remembered under. */
export const COLOR_SCHEME_STORAGE_KEY = 'wisp-color-scheme';

/** What can have a colour scheme: an element, or anything with an inline style. */
export interface ColorSchemeTarget {
  style: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'>;
  dataset?: DOMStringMap;
}

/** The part of `Storage` that is read. */
type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

const isScheme = (value: unknown): value is ColorScheme =>
  value === 'light' || value === 'dark' || value === 'system';

/**
 * Makes `target` (the page, by default) light or dark, or lets it follow the system again. It
 * sets the element's own `color-scheme`, which wins over `theme.css`, so every colour role below
 * it follows; and a `data-wisp-color-scheme` attribute, for styling of your own.
 */
export function applyColorScheme(
  scheme: ColorScheme,
  target: ColorSchemeTarget = document.documentElement,
): void {
  if (scheme === 'system') {
    target.style.removeProperty('color-scheme');
    if (target.dataset) delete target.dataset.wispColorScheme;
  } else {
    target.style.setProperty('color-scheme', scheme);
    if (target.dataset) target.dataset.wispColorScheme = scheme;
  }
}

/** The scheme that is actually shown: `system` resolved by asking the system. */
export function resolveColorScheme(
  scheme: ColorScheme,
  matchMedia: Pick<Window, 'matchMedia'>['matchMedia'] = (query) => window.matchMedia(query),
): 'light' | 'dark' {
  if (scheme !== 'system') return scheme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** The remembered choice, or `system` when there is none (or storage is not available). */
export function readColorScheme(
  storage: ReadableStorage | undefined = safeLocalStorage(),
): ColorScheme {
  try {
    const stored = storage?.getItem(COLOR_SCHEME_STORAGE_KEY);
    return isScheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Remembers the choice. `system` forgets it. Returns whether storage took it. */
export function storeColorScheme(
  scheme: ColorScheme,
  storage: WritableStorage | undefined = safeLocalStorage(),
): boolean {
  try {
    if (!storage) return false;
    if (scheme === 'system') storage.removeItem(COLOR_SCHEME_STORAGE_KEY);
    else storage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
    return true;
  } catch {
    return false;
  }
}

/** `localStorage`, or nothing where reading it throws (blocked site data, some private windows). */
function safeLocalStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/**
 * A script that applies the remembered choice at once. Put it inline in the document's `<head>`,
 * before the stylesheets, so the first paint is already in the right scheme:
 *
 * ```html
 * <script>{colorSchemeScript}</script>
 * ```
 *
 * It does what `readColorScheme` and `applyColorScheme` do to the page, in as few bytes as it can.
 */
export const colorSchemeScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(COLOR_SCHEME_STORAGE_KEY)});if(s==="light"||s==="dark"){var r=document.documentElement;r.style.setProperty("color-scheme",s);r.dataset.wispColorScheme=s}}catch(e){}})()`;
