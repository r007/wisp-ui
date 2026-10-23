'use client';

import type { ChangeEvent, ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import { cx } from '../foundation/cx.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import styles from './slider.module.css';
import tokens from './slider.tokens.generated.module.css';

export type SliderSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

export interface SliderProps
  extends Omit<
    ComponentPropsWithRef<'input'>,
    'type' | 'size' | 'value' | 'defaultValue' | 'onChange' | 'children' | 'min' | 'max' | 'step'
  > {
  /** The current value. Controlled when defined. */
  value?: number;
  defaultValue?: number;
  /** Called with the new value as it moves. */
  onValueChange?: (value: number) => void;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** @default 1 */
  step?: number;
  /**
   * The thickness of the track: 16, 24, 40, 56 or 96px.
   * @default 'xsmall'
   */
  size?: SliderSize;
  /** An icon in the active track, for the medium and larger sizes. Decorative. */
  icon?: ReactNode;
  /** Shows the value in a bubble above the handle while it is held or focused. @default true */
  showValue?: boolean;
  /** Formats the number in the bubble, and in `aria-valuetext` when it returns text. */
  formatValue?: (value: number) => ReactNode;
  /** Class for the outer element. Everything else is passed to the `<input>`. */
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * A slider, on a native `<input type="range">`: keyboard, forms, touch and assistive
 * technology work without extra wiring. Name it with `aria-label`:
 *
 * ```tsx
 * <Slider aria-label="Volume" defaultValue={40} />
 * ```
 */
export function Slider({
  value: valueProp,
  defaultValue,
  onValueChange,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  size = 'xsmall',
  icon,
  showValue = true,
  formatValue,
  disabled,
  className,
  style,
  ref,
  ...inputProps
}: SliderProps) {
  const [value, setValue] = useControllableState<number>({
    value: valueProp,
    defaultValue: defaultValue ?? min,
    onChange: onValueChange,
  });
  const span = max - min;
  const fraction = span > 0 ? Math.min(Math.max((value - min) / span, 0), 1) : 0;
  const formatted = formatValue ? formatValue(value) : value;

  return (
    <div
      className={cx(styles.root, tokens.root, tokens[`size-${size}`], className)}
      style={{ ...style, '--_fraction': fraction } as CSSProperties}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      data-end={fraction >= 0.98 ? '' : undefined}
    >
      <input
        aria-valuetext={typeof formatted === 'string' ? formatted : undefined}
        {...inputProps}
        ref={ref}
        type="range"
        className={styles.input}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event);
          setValue(event.currentTarget.valueAsNumber);
        }}
      />
      <div className={styles.track} aria-hidden="true">
        <div className={styles.active}>
          {icon ? <span className={styles.icon}>{icon}</span> : null}
        </div>
        <div className={styles.inactive} />
        <span className={styles.stop} />
        <span className={styles.handle} />
      </div>
      {showValue ? (
        <output className={styles.value} aria-hidden="true">
          {formatted}
        </output>
      ) : null}
    </div>
  );
}
