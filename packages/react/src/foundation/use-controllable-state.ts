import { useCallback, useRef, useState } from 'react';

/**
 * Controlled/uncontrolled state in one hook. The component is controlled
 * whenever `value` is defined.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value: T | undefined;
  defaultValue: T;
  onChange?: ((next: T) => void) | undefined;
}): [T, (next: T) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const set = useCallback(
    (next: T) => {
      if (!controlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [controlled],
  );
  return [controlled ? value : internal, set];
}
