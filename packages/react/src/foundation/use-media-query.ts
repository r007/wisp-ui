import { useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept up to date. It is `false` on the server and for the first
 * render on the client, so server and client markup agree; the real answer follows at once.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
