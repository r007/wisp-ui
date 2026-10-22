import { useEffect, useRef } from 'react';
import { RippleController } from './ripple-controller.js';

/**
 * Wires the press ripple to a control. Attach `controlRef` to the interactive
 * element and `surfaceRef` to its `<StateLayer>`. Hover and focus are CSS.
 */
export function useStateLayer<T extends HTMLElement>({ disabled = false } = {}) {
  const controlRef = useRef<T | null>(null);
  const surfaceRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const control = controlRef.current;
    const surface = surfaceRef.current;
    if (disabled || !control || !surface) return;
    const controller = new RippleController(control, surface);
    return () => controller.destroy();
  }, [disabled]);

  return { controlRef, surfaceRef };
}
