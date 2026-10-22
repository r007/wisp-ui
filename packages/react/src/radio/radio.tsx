'use client';

import { type ComponentPropsWithRef, createContext, use } from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import styles from './radio.module.css';
import tokens from './radio.tokens.generated.module.css';

/** What a `RadioGroup` tells the radios inside it. */
export interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  disabled: boolean;
  required: boolean;
  select: (value: string) => void;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioProps
  extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children'> {
  /** Class for the outer element. Everything else is passed to the `<input>`. */
  className?: string;
}

/**
 * A Material radio button. It is a native `<input type="radio">`: radios sharing a
 * `name` form a group, and arrow keys move between them without extra wiring.
 * Inside a `RadioGroup` the group supplies `name`, `checked` and `onChange`:
 *
 * ```tsx
 * <RadioGroup aria-label="Size" defaultValue="m">
 *   <label><Radio value="s" /> Small</label>
 *   <label><Radio value="m" /> Medium</label>
 * </RadioGroup>
 * ```
 *
 * Unlabelled radios need `aria-label`.
 */
export function Radio({
  disabled,
  className,
  ref,
  value,
  name,
  checked,
  onChange,
  required,
  ...inputProps
}: RadioProps) {
  const group = use(RadioGroupContext);
  const isDisabled = disabled ?? group?.disabled ?? false;
  const { controlRef, surfaceRef } = useStateLayer<HTMLInputElement>({ disabled: isDisabled });
  const mergedRef = useMergedRef(controlRef, ref);

  // Inside a group the group owns the selection.
  const groupProps = group
    ? {
        name: name ?? group.name,
        checked: checked ?? (value !== undefined && group.value === String(value)),
        required: required ?? group.required,
        onChange: (event: Parameters<NonNullable<RadioProps['onChange']>>[0]) => {
          onChange?.(event);
          if (value !== undefined && !event.defaultPrevented) group.select(String(value));
        },
      }
    : { name, checked, required, onChange };

  return (
    <span className={cx(styles.root, tokens.root, className)}>
      <input
        {...inputProps}
        {...groupProps}
        value={value}
        ref={mergedRef}
        type="radio"
        className={styles.input}
        disabled={isDisabled}
      />
      <span className={styles.host}>
        <StateLayer ref={surfaceRef} />
        <span className={styles.ring} data-slot="ring">
          <span className={styles.dot} data-slot="dot" />
        </span>
      </span>
    </span>
  );
}
