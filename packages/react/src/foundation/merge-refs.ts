import { type Ref, type RefCallback, useMemo } from 'react';

/**
 * Combines refs into one callback ref. Relies on React 19 ref cleanups, so
 * object refs are cleared and callback refs are detached on unmount.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (node) => {
    const cleanups: Array<() => void> = [];
    for (const ref of refs) {
      if (typeof ref === 'function') {
        const cleanup = ref(node);
        cleanups.push(typeof cleanup === 'function' ? cleanup : () => ref(null));
      } else if (ref) {
        ref.current = node;
        cleanups.push(() => {
          ref.current = null;
        });
      }
    }
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  };
}

/**
 * Stable merged ref. A new callback identity every render would make React
 * detach and re-attach the node each time.
 */
export function useMergedRef<T>(a: Ref<T> | undefined, b: Ref<T> | undefined): RefCallback<T> {
  return useMemo(() => mergeRefs(a, b), [a, b]);
}
