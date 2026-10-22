'use client';

import {
  type ChangeEvent,
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  use,
  useId,
  useMemo,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import styles from './segmented-button.module.css';
import tokens from './segmented-button.tokens.generated.module.css';

interface SegmentedButtonContextValue {
  multiple: boolean;
  name: string;
  selected: readonly string[];
  toggle: (value: string, checked: boolean) => void;
  disabled: boolean;
}

const SegmentedButtonContext = createContext<SegmentedButtonContextValue | null>(null);

export interface SegmentedButtonProps
  extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange' | 'role'> {
  /** Allow several segments to be on at once. Then `value` is an array. */
  multiple?: boolean;
  /** The selected segment's value (an array of them when `multiple`). Controlled when defined. */
  value?: string | string[];
  defaultValue?: string | string[];
  /** Called with the new value: a string, or an array when `multiple`. */
  onValueChange?: (value: string & string[]) => void;
  /** Shared `name` for form submission. Generated when omitted. */
  name?: string;
  disabled?: boolean;
  /** Names the group. */
  'aria-label'?: string;
  children: ReactNode;
}

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * A group of two to five segments to choose between. Single-select segments are radios, so the
 * arrow keys move between them; multi-select ones are checkboxes. Both are native inputs, so
 * they work in forms:
 *
 * ```tsx
 * <SegmentedButton aria-label="View" defaultValue="week">
 *   <SegmentedButtonItem value="day">Day</SegmentedButtonItem>
 *   <SegmentedButtonItem value="week">Week</SegmentedButtonItem>
 * </SegmentedButton>
 * ```
 */
export function SegmentedButton({
  multiple = false,
  value: valueProp,
  defaultValue,
  onValueChange,
  name,
  disabled = false,
  className,
  children,
  ...rest
}: SegmentedButtonProps) {
  const generatedName = useId();
  const [selected, setSelected] = useControllableState<string[]>({
    value: valueProp === undefined ? undefined : asArray(valueProp),
    defaultValue: asArray(defaultValue),
    onChange: (next) => onValueChange?.((multiple ? next : (next[0] ?? '')) as string & string[]),
  });

  const context = useMemo<SegmentedButtonContextValue>(
    () => ({
      multiple,
      name: name ?? generatedName,
      selected,
      disabled,
      toggle: (segment, checked) =>
        setSelected(
          multiple
            ? checked
              ? [...selected, segment]
              : selected.filter((entry) => entry !== segment)
            : [segment],
        ),
    }),
    [multiple, name, generatedName, selected, disabled, setSelected],
  );

  return (
    <SegmentedButtonContext value={context}>
      <div
        {...rest}
        role={multiple ? 'group' : 'radiogroup'}
        className={cx(styles.root, tokens.root, className)}
      >
        {children}
      </div>
    </SegmentedButtonContext>
  );
}

export interface SegmentedButtonItemProps
  extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'value' | 'children' | 'size' | 'name'> {
  /** Identifies this segment; the group's `value` is made of these. */
  value: string;
  /** An icon, 18px. A selected segment shows a check in its place. Decorative. */
  icon?: ReactNode;
  /** The label. An icon-only segment needs `aria-label`. */
  children?: ReactNode;
}

/** One segment of a `SegmentedButton`. */
export function SegmentedButtonItem({
  value,
  icon,
  children,
  className,
  disabled: disabledProp,
  onChange,
  ref,
  ...rest
}: SegmentedButtonItemProps) {
  const group = use(SegmentedButtonContext);
  if (!group) throw new Error('SegmentedButtonItem must be used inside <SegmentedButton>.');
  const disabled = disabledProp ?? group.disabled;
  const { controlRef, surfaceRef } = useStateLayer<HTMLInputElement>({ disabled });
  const mergedRef = useMergedRef(controlRef, ref);

  return (
    <label
      className={cx(styles.segment, className)}
      data-icon={icon ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
    >
      <input
        {...rest}
        ref={mergedRef}
        type={group.multiple ? 'checkbox' : 'radio'}
        name={group.name}
        value={value}
        className={styles.input}
        checked={group.selected.includes(value)}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event);
          group.toggle(value, event.currentTarget.checked);
        }}
      />
      <StateLayer ref={surfaceRef} />
      <span className={styles.leading} aria-hidden="true">
        {icon ? <span className={styles.icon}>{icon}</span> : null}
        <svg className={styles.tick} viewBox="0 0 18 18" aria-hidden="true">
          <path d="M4 9.4l3.2 3.2L14 5.6" pathLength="1" />
        </svg>
      </span>
      {children !== undefined && children !== null ? (
        <span className={styles.label}>{children}</span>
      ) : null}
    </label>
  );
}
