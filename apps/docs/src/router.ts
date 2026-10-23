/**
 * A small router for the History API. The site is static, so every page is a real path
 * (`/components/button/`), and a link is an ordinary `<a href>`: one listener on the document turns a
 * click on a link into this site into a navigation without a reload, so every component that takes an
 * `href` (a `Button`, a `ListItem`) works as a link with nothing extra.
 */

import { useSyncExternalStore } from 'react';

/** `/wisp-ui/`, or `/` on a domain of its own. */
export const BASE = import.meta.env.BASE_URL;

/** The URL for a path in the site: `/components/` becomes `/wisp-ui/components/`. */
export function href(path: string): string {
  return `${BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface Location {
  /** The path inside the site, always with a leading and a trailing slash. */
  path: string;
  /** `#section`, or an empty string. */
  hash: string;
}

let current: Location | undefined;
let currentKey = '';

function read(): Location {
  const { pathname, hash } = window.location;
  const key = pathname + hash;
  if (current && key === currentKey) return current;
  let path = pathname.startsWith(BASE) ? pathname.slice(BASE.length - 1) : pathname;
  if (!path.endsWith('/')) path += '/';
  currentKey = key;
  current = { path, hash: decodeURIComponent(hash) };
  return current;
}

const NAVIGATED = 'wisp:navigate';

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('hashchange', callback);
  window.addEventListener(NAVIGATED, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('hashchange', callback);
    window.removeEventListener(NAVIGATED, callback);
  };
}

const server: Location = { path: '/', hash: '' };

/** Where the visitor is, and a new value whenever they go somewhere else. */
export function useLocation(): Location {
  return useSyncExternalStore(subscribe, read, () => server);
}

/** Goes to a URL of this site, as a link would. */
export function navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
  const url = to.startsWith('/') && !to.startsWith(BASE) ? href(to) : to;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(NAVIGATED));
}

/** Makes a click on a link into this site a navigation. Call it once. */
export function installLinkHandler(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element | null)?.closest?.(
      'a[href]',
    ) as HTMLAnchorElement | null;
    if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download'))
      return;
    // A page that is not part of the app (Storybook): a real navigation.
    if (anchor.hasAttribute('data-reload')) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(BASE)) return;
    // A link to a place on this very page: the browser scrolls, and says so with `hashchange`.
    if (url.pathname === window.location.pathname && url.hash) return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
