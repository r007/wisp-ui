import { useSyncExternalStore } from 'react';

/** Whether a media query matches, now and as it changes. False on the server. */
export function useMatchMedia(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', callback);
      return () => list.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
