'use client';

import type { ChangeEvent, ComponentPropsWithRef } from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import styles from './switch.module.css';
import tokens from './switch.tokens.generated.module.css';

export interface SwitchProps
  extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'role' | 'size'> {
  /** Show a check or close icon in the handle. */
  icons?: boolean;
  /** Convenience over `onChange` when only the new value matters. */
  onCheckedChange?: (checked: boolean) => void;
  /** Class for the outer element. Everything else is passed to the `<input>`. */
  className?: string;
}

/**
 * A switch. It is a native `<input type="checkbox" role="switch">`, so
 * forms, labels, keyboard and assistive technology work without extra wiring:
 *
 * ```tsx
 * <label>
 *   <Switch defaultChecked /> Wi-Fi
 * </label>
 * ```
 *
 * Unlabelled switches need `aria-label`.
 */
export function Switch({
  icons = false,
  onCheckedChange,
  onChange,
  disabled,
  className,
  ref,
  ...inputProps
}: SwitchProps) {
  const { controlRef, surfaceRef } = useStateLayer<HTMLInputElement>({
    disabled: Boolean(disabled),
  });
  const mergedRef = useMergedRef(controlRef, ref);

  return (
    <span className={cx(styles.root, tokens.root, className)} data-icons={icons ? '' : undefined}>
      <input
        {...inputProps}
        ref={mergedRef}
        type="checkbox"
        // biome-ignore lint/a11y/useAriaPropsForRole: a native checkbox exposes its checked state itself; adding aria-checked would conflict with it (ARIA in HTML).
        role="switch"
        className={styles.input}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event);
          onCheckedChange?.(event.currentTarget.checked);
        }}
      />
      <span className={styles.track}>
        <span className={styles.handleContainer}>
          <StateLayer ref={surfaceRef} />
          <span className={styles.handle}>
            <svg
              className={cx(styles.icon, styles.iconCheck)}
              viewBox="0 -960 960 960"
              aria-hidden="true"
            >
              <path d="M378-246 154-470l43-43 181 181 384-384 43 43-427 427Z" />
            </svg>
            <svg
              className={cx(styles.icon, styles.iconClose)}
              viewBox="0 -960 960 960"
              aria-hidden="true"
            >
              <path d="m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z" />
            </svg>
          </span>
        </span>
      </span>
    </span>
  );
}
