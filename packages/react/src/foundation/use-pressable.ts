import type { MouseEvent, Ref } from 'react';
import { useMergedRef } from './merge-refs.js';
import { useControllableState } from './use-controllable-state.js';
import { useStateLayer } from './use-state-layer.js';

export interface PressableOptions {
  /** Renders an anchor instead of a button. */
  href?: string | undefined;
  disabled?: boolean | undefined;
  /** Makes it a toggle when defined; controlled. */
  selected?: boolean | undefined;
  defaultSelected?: boolean | undefined;
  onSelectedChange?: ((selected: boolean) => void) | undefined;
  onClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  ref?: Ref<HTMLElement> | undefined;
  type?: string | undefined;
}

/**
 * Behaviour shared by every pressable control (Button, IconButton, FAB, …):
 * button-or-link semantics, disabled handling, toggle state, and the press
 * ripple. Spread `props` onto the root element and render `<StateLayer ref={surfaceRef} />`
 * inside it.
 */
export function usePressable({
  href,
  disabled = false,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  onClick,
  ref,
  type,
}: PressableOptions) {
  const isLink = href !== undefined;
  const isToggle = selectedProp !== undefined || defaultSelected !== undefined;
  const [selected, setSelected] = useControllableState({
    value: selectedProp,
    defaultValue: defaultSelected ?? false,
    onChange: onSelectedChange,
  });

  const { controlRef, surfaceRef } = useStateLayer<HTMLElement>({ disabled });
  const mergedRef = useMergedRef(controlRef, ref);

  const props = {
    ref: mergedRef,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
      if (isToggle && !event.defaultPrevented) setSelected(!selected);
    },
    'aria-pressed': isToggle ? selected : undefined,
    // Links cannot be natively disabled. Without an href an <a> loses its link
    // role, so restore it explicitly (the ARIA pattern for a disabled link).
    ...(isLink
      ? {
          href: disabled ? undefined : href,
          role: disabled ? 'link' : undefined,
          'aria-disabled': disabled || undefined,
          tabIndex: disabled ? -1 : undefined,
        }
      : { type: type ?? 'button', disabled }),
  };

  return {
    tag: isLink ? ('a' as const) : ('button' as const),
    isToggle,
    selected,
    surfaceRef,
    props,
  };
}
