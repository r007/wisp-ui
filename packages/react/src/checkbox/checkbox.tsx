'use client';

import { type ChangeEvent, type ComponentPropsWithRef, useEffect } from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import styles from './checkbox.module.css';
import tokens from './checkbox.tokens.generated.module.css';

export interface CheckboxProps
  extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children'> {
  /**
   * Shows the mixed state, e.g. "select all" over a partly selected list. It is
   * controlled: the box stays mixed until you change the prop, whatever the user does.
   */
  indeterminate?: boolean;
  /** Marks the checkbox invalid (red) and sets `aria-invalid`. */
  error?: boolean;
  /** Convenience over `onChange` when only the new value matters. */
  onCheckedChange?: (checked: boolean) => void;
  /** Class for the outer element. Everything else is passed to the `<input>`. */
  className?: string;
}

/**
 * A checkbox. It is a native `<input type="checkbox">`, so forms,
 * labels, keyboard and assistive technology work without extra wiring:
 *
 * ```tsx
 * <label>
 *   <Checkbox defaultChecked /> Remember me
 * </label>
 * ```
 *
 * Unlabelled checkboxes need `aria-label`.
 */
export function Checkbox({
  indeterminate = false,
  error = false,
  onCheckedChange,
  onChange,
  disabled,
  className,
  ref,
  ...inputProps
}: CheckboxProps) {
  const { controlRef, surfaceRef } = useStateLayer<HTMLInputElement>({
    disabled: Boolean(disabled),
  });
  const mergedRef = useMergedRef(controlRef, ref);

  // `indeterminate` is a DOM property with no attribute, so it is synced on every
  // render: the browser clears it on click, and a controlled parent may keep it.
  useEffect(() => {
    if (controlRef.current) controlRef.current.indeterminate = indeterminate;
  });

  return (
    <span className={cx(styles.root, tokens.root, className)} data-error={error ? '' : undefined}>
      <input
        aria-invalid={error || undefined}
        {...inputProps}
        ref={mergedRef}
        type="checkbox"
        className={styles.input}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event);
          onCheckedChange?.(event.currentTarget.checked);
          // Controlled: put it back unless the parent changes the prop.
          event.currentTarget.indeterminate = indeterminate;
        }}
      />
      <span className={styles.host}>
        <StateLayer ref={surfaceRef} />
        <span className={styles.container} data-slot="container">
          <svg className={styles.mark} viewBox="0 0 18 18" aria-hidden="true">
            <path className={styles.check} d="M4 9.4l3.2 3.2L14 5.6" pathLength="1" />
            <path className={styles.dash} d="M4 9h10" pathLength="1" />
          </svg>
        </span>
      </span>
    </span>
  );
}
