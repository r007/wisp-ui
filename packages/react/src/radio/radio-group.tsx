'use client';

import { type ComponentPropsWithRef, useId, useMemo } from 'react';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { RadioGroupContext, type RadioGroupContextValue } from './radio.js';

export interface RadioGroupProps
  extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange' | 'role'> {
  /** The selected radio's `value`. Controlled when defined. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shared `name` for form submission. Generated when omitted. */
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Groups radios: it owns the selected value and gives every radio inside the same
 * `name`. It renders `role="radiogroup"`, so name it with `aria-label` or
 * `aria-labelledby`.
 */
export function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  name,
  disabled = false,
  required = false,
  ...rest
}: RadioGroupProps) {
  const generatedName = useId();
  const [selected, select] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: (next) => next !== undefined && onValueChange?.(next),
  });

  const context = useMemo<RadioGroupContextValue>(
    () => ({
      name: name ?? generatedName,
      value: selected,
      disabled,
      required,
      select,
    }),
    [name, generatedName, selected, disabled, required, select],
  );

  return (
    <RadioGroupContext value={context}>
      <div {...rest} role="radiogroup" aria-required={required || undefined} />
    </RadioGroupContext>
  );
}
