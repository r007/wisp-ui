'use client';

import {
  type ChangeEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useId,
  useRef,
  useState,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import styles from './text-field.module.css';
import tokens from './text-field.tokens.generated.module.css';

export type TextFieldVariant = 'filled' | 'outlined';

/** Input types that always show something (a date format, a colour), so the label never rests. */
const ALWAYS_FLOATED = new Set(['date', 'datetime-local', 'month', 'time', 'week', 'color']);

interface TextFieldOwnProps {
  /** @default 'filled' */
  variant?: TextFieldVariant;
  /** Names the field and floats above the text once it is focused or filled. Without one, pass `aria-label`. */
  label?: ReactNode;
  /** Help below the field. Linked to the input with `aria-describedby`. */
  supportingText?: ReactNode;
  /** Marks the field invalid (red) and sets `aria-invalid`. */
  error?: boolean;
  /** Shown in place of `supportingText` while `error` is set. */
  errorText?: ReactNode;
  /** Decorative icon before the text. */
  leadingIcon?: ReactNode;
  /** Icon or control after the text, such as a clear or visibility button. */
  trailingIcon?: ReactNode;
  /** Fixed text before the value, such as a currency sign. Shown once the label has floated. */
  prefixText?: string;
  /** Fixed text after the value, such as a unit. */
  suffixText?: string;
  /** Shows "length/maxLength" under the field. Needs `maxLength`. */
  counter?: boolean;
  /** A `<textarea>` instead of an `<input>`. */
  multiline?: boolean;
  /** Visible lines of a multiline field. @default 2 */
  rows?: number;
  /** Convenience over `onChange` when only the new value matters. */
  onValueChange?: (value: string) => void;
  /** Class for the outer element. Everything else is passed to the input. */
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  ref?: Ref<HTMLInputElement | HTMLTextAreaElement>;
}

export type TextFieldProps = TextFieldOwnProps &
  Omit<ComponentPropsWithRef<'input'>, keyof TextFieldOwnProps | 'size' | 'prefix' | 'children'>;

/**
 * A Material text field, on the native `<input>` (or `<textarea>`), so forms, autofill,
 * validation and assistive technology work without extra wiring:
 *
 * ```tsx
 * <TextField label="Email" type="email" supportingText="We never share it" />
 * ```
 *
 * The label floats with CSS alone (`:focus-within`, `:placeholder-shown`), so the field
 * can be controlled or uncontrolled.
 */
export function TextField({
  variant = 'filled',
  label,
  supportingText,
  error = false,
  errorText,
  leadingIcon,
  trailingIcon,
  prefixText,
  suffixText,
  counter = false,
  multiline = false,
  rows = 2,
  onValueChange,
  onChange,
  className,
  id: idProp,
  disabled,
  required,
  placeholder,
  maxLength,
  type,
  value,
  defaultValue,
  ref,
  'aria-describedby': describedBy,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const supportId = `${id}-support`;
  const controlRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const mergedRef = useMergedRef(controlRef, ref);

  const message = error && errorText ? errorText : supportingText;
  const showCounter = counter && maxLength !== undefined;
  const [uncontrolledLength, setLength] = useState(String(defaultValue ?? '').length);
  const length = value !== undefined ? String(value).length : uncontrolledLength;

  const text = (
    <>
      {label}
      {required && label ? <span aria-hidden="true"> *</span> : null}
    </>
  );

  const shared = {
    ...inputProps,
    id,
    ref: mergedRef,
    disabled,
    required,
    maxLength,
    value,
    defaultValue,
    // A single space gives CSS `:placeholder-shown` to detect "empty" without a placeholder.
    placeholder: placeholder ?? ' ',
    className: styles.input,
    'aria-invalid': error || undefined,
    'aria-describedby':
      cx(message || showCounter ? supportId : undefined, describedBy) || undefined,
    onChange: (event: ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => {
      onChange?.(event);
      setLength(event.currentTarget.value.length);
      onValueChange?.(event.currentTarget.value);
    },
  };

  return (
    <div
      className={cx(styles.root, tokens[variant], className)}
      data-variant={variant}
      data-error={error ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-multiline={multiline ? '' : undefined}
      data-label={label ? '' : undefined}
      data-float={type && ALWAYS_FLOATED.has(type) ? '' : undefined}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: a pointer shortcut that focuses the input when the padding, an icon or the label area is pressed; the input itself is reachable by keyboard. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: same pointer shortcut that focuses the input when the padding, an icon or the label area is pressed; the input itself is reachable by keyboard. */}
      <div
        className={styles.field}
        data-slot="field"
        onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
          const target = event.target as Element;
          const control = controlRef.current;
          if (
            !control ||
            disabled ||
            target === control ||
            target.closest('button, a, input, textarea')
          ) {
            return;
          }
          // Keep the click from blurring the input, then focus it.
          event.preventDefault();
          control.focus();
        }}
      >
        {leadingIcon ? (
          <span className={styles.leading} aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        <div className={styles.control}>
          {label ? (
            <label htmlFor={id} className={styles.label} data-slot="label">
              {text}
            </label>
          ) : null}
          <div className={styles.inputRow}>
            {prefixText ? <span className={styles.prefix}>{prefixText}</span> : null}
            {multiline ? (
              <textarea
                {...(shared as object)}
                rows={rows}
                // `rows` is also the minimum height where the box grows with its content.
                style={{ ...inputProps.style, '--_rows': rows } as CSSProperties}
              />
            ) : (
              <input {...shared} type={type} />
            )}
            {suffixText ? <span className={styles.suffix}>{suffixText}</span> : null}
          </div>
        </div>
        {trailingIcon ? <span className={styles.trailing}>{trailingIcon}</span> : null}
        {variant === 'filled' ? (
          <span className={styles.indicator} data-slot="indicator" aria-hidden="true" />
        ) : (
          <span className={styles.outline} aria-hidden="true">
            <span className={styles.outlineStart} data-slot="outline-start" />
            <span className={styles.outlineNotch} data-slot="notch">
              <span className={styles.notchLabel}>{text}</span>
            </span>
            <span className={styles.outlineEnd} />
          </span>
        )}
      </div>
      {message || showCounter ? (
        <div className={styles.support}>
          <span id={supportId} className={styles.message} data-slot="support">
            {message}
          </span>
          {showCounter ? (
            <span className={styles.counter} aria-hidden="true">
              {length}/{maxLength}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
