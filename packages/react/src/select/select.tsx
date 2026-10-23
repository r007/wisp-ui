'use client';

import {
  Children,
  type CSSProperties,
  createContext,
  Fragment,
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  use,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cx } from '../foundation/cx.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { usePopover } from '../foundation/use-popover.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import list from '../list/list.module.css';
import menu from '../menu/menu.module.css';
import menuTokens from '../menu/menu.tokens.generated.module.css';
import { TextField, type TextFieldProps } from '../text-field/text-field.js';
import styles from './select.module.css';

const ArrowGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M480-360 280-559h400L480-360Z" />
  </svg>
);

interface OptionInfo {
  value: string;
  disabled: boolean;
  /** What the field shows when the option is chosen, and what typing a letter matches. */
  text: string;
}

interface SelectContextValue {
  selected: string | undefined;
  activeValue: string | undefined;
  optionId: (value: string) => string;
  choose: (value: string) => void;
  activate: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export interface SelectOptionProps {
  /** What is chosen when this option is. It must be unique among the options. */
  value: string;
  /** The option's label. */
  children: ReactNode;
  /**
   * The text the field shows once this is chosen, and that typing a letter matches. Needed when
   * `children` is not a plain string or number.
   */
  textValue?: string;
  /** A 20px icon before the label. Decorative. */
  leading?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** The text of an option: `textValue`, else its children when they are a string or a number. */
const textOf = ({ textValue, children }: Pick<SelectOptionProps, 'textValue' | 'children'>) =>
  textValue ??
  (typeof children === 'string' || typeof children === 'number' ? String(children) : '');

/** One choice in a `Select`. Put it directly in the `Select`, or in a fragment in it. */
export function SelectOption({
  value,
  children,
  leading,
  disabled = false,
  className,
}: SelectOptionProps) {
  const context = use(SelectContext);
  if (!context) throw new Error('SelectOption must be used inside <Select>.');
  const { surfaceRef, controlRef } = useStateLayer<HTMLDivElement>({ disabled });
  const selected = context.selected === value;
  const active = context.activeValue === value;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keys belong to the combobox that owns this option, which keeps the focus; the pointer chooses it here.
    // biome-ignore lint/a11y/useFocusableInteractive: an option is never focused: the field keeps the focus and names the active option with aria-activedescendant.
    <div
      ref={controlRef}
      id={context.optionId(value)}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      className={cx(list.item, menu.item, styles.option, className)}
      data-lines={1}
      data-interactive=""
      data-selected={selected ? '' : undefined}
      data-active={active ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-value={value}
      // The field keeps the focus: pressing an option must not take it.
      onMouseDown={(event) => event.preventDefault()}
      onPointerMove={() => !disabled && context.activate(value)}
      onClick={() => !disabled && context.choose(value)}
    >
      <StateLayer ref={surfaceRef} />
      {leading ? (
        <span className={list.leading} data-kind="icon" aria-hidden="true">
          {leading}
        </span>
      ) : null}
      <span className={list.text}>
        <span className={list.headline}>{children}</span>
      </span>
    </div>
  );
}

export interface SelectProps
  extends Omit<
    TextFieldProps,
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'onValueChange'
    | 'type'
    | 'multiline'
    | 'rows'
    | 'readOnly'
    | 'children'
    | 'trailingIcon'
    | 'prefixText'
    | 'suffixText'
    | 'counter'
    | 'maxLength'
  > {
  /** The chosen option's `value`, or `null` for none. Controlled when defined. */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with the `value` of the option that was chosen. */
  onValueChange?: (value: string) => void;
  /** The `SelectOption`s, directly or in fragments. */
  children: ReactNode;
  /** Submitted with a form, as a hidden field of this name. */
  name?: string;
}

const isOption = (node: ReactNode): node is ReactElement<SelectOptionProps> =>
  isValidElement(node) && typeof (node.props as { value?: unknown }).value === 'string';

/** The options in `children`, looking through fragments and arrays, in order. */
function collectOptions(children: ReactNode): ReactElement<SelectOptionProps>[] {
  return Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment)
      return collectOptions((child.props as { children?: ReactNode }).children);
    return isOption(child) ? [child] : [];
  });
}

/**
 * A field to choose one of a list in, following the WAI-ARIA select-only combobox pattern: the
 * focus stays on the field, which opens a listbox of options and names the active one with
 * `aria-activedescendant`. Arrow keys, Home, End and typing move through the options, Enter and
 * Space choose, Escape closes. It looks like a `TextField` (it is one, read-only), with all of
 * its label, supporting text and error behaviour:
 *
 * ```tsx
 * <Select label="Fruit" value={fruit} onValueChange={setFruit}>
 *   <SelectOption value="apple">Apple</SelectOption>
 *   <SelectOption value="pear">Pear</SelectOption>
 * </Select>
 * ```
 */
export function Select({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  children,
  name,
  variant = 'filled',
  disabled,
  className,
  onKeyDown,
  onBlur,
  ...rest
}: SelectProps) {
  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange as ((next: string | null) => void) | undefined,
  });
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<string | undefined>(undefined);
  const id = useId();
  const listboxId = `${id}-listbox`;
  const optionId = (optionValue: string) => `${id}-option-${optionValue.replace(/\W/g, '_')}`;
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const typed = useRef({ text: '', timer: 0 });

  const options: OptionInfo[] = useMemo(
    () =>
      collectOptions(children).map((child) => ({
        value: child.props.value,
        disabled: child.props.disabled === true,
        text: textOf(child.props),
      })),
    [children],
  );
  const enabled = options.filter((option) => !option.disabled);
  const selected = options.find((option) => option.value === value);

  const popover = usePopover({
    open,
    onOpenChange: (next) => {
      if (!next) setOpen(false);
    },
    ignore: [root],
  });
  const openWith = (target: 'selected' | 'first' | 'last' | string) => {
    if (disabled || enabled.length === 0) return;
    const wanted =
      target === 'first'
        ? enabled[0]
        : target === 'last'
          ? enabled.at(-1)
          : target === 'selected'
            ? selected && !selected.disabled
              ? selected
              : enabled[0]
            : enabled.find((option) => option.value === target);
    setActiveValue(wanted?.value);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const choose = (next: string) => {
    setValue(next);
    close();
  };

  /** Moves the active option by `step` along the options that can be chosen. */
  const move = (step: number) => {
    const current = enabled.findIndex((option) => option.value === activeValue);
    const next = Math.min(Math.max(current + step, 0), enabled.length - 1);
    setActiveValue(enabled[next]?.value);
  };

  /** The option a typed prefix names, searching on from the active one. */
  const match = (key: string) => {
    const clock = typed.current;
    window.clearTimeout(clock.timer);
    clock.text += key.toLowerCase();
    clock.timer = window.setTimeout(() => {
      clock.text = '';
    }, 500);
    // One letter, or the same letter again, steps on through the options that start with it; a
    // longer prefix narrows the search, so the option it is on may still be the one.
    const repeated = [...clock.text].every((letter) => letter === clock.text[0]);
    const prefix = repeated ? (clock.text[0] as string) : clock.text;
    const from = enabled.findIndex((option) => option.value === (open ? activeValue : value));
    const start = Math.max(repeated ? from + 1 : from, 0);
    const ordered = [...enabled.slice(start), ...enabled.slice(0, start)];
    return ordered.find((option) => option.text.toLowerCase().startsWith(prefix));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    (onKeyDown as ((event: KeyboardEvent<HTMLInputElement>) => void) | undefined)?.(event);
    if (event.defaultPrevented || disabled) return;
    const { key } = event;
    let handled = true;
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ')
        openWith('selected');
      else if (key === 'Home') openWith('first');
      else if (key === 'End') openWith('last');
      else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const found = match(key);
        if (found) openWith(found.value);
        else handled = false;
      } else handled = false;
    } else if (key === 'ArrowDown') {
      if (event.altKey) {
        handled = true;
      } else move(1);
    } else if (key === 'ArrowUp') {
      // Alt and Up choose the active option, as Enter does.
      if (event.altKey && activeValue !== undefined) choose(activeValue);
      else move(-1);
    } else if (key === 'Home') setActiveValue(enabled[0]?.value);
    else if (key === 'End') setActiveValue(enabled.at(-1)?.value);
    else if (key === 'PageDown') move(10);
    else if (key === 'PageUp') move(-10);
    else if (key === 'Enter' || key === ' ') {
      if (activeValue !== undefined) choose(activeValue);
      else close();
    } else if (key === 'Escape') close();
    else if (key === 'Tab') {
      // The active option is taken, and the focus moves on as it would.
      if (activeValue !== undefined) setValue(activeValue);
      close();
      handled = false;
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const found = match(key);
      if (found) setActiveValue(found.value);
    } else handled = false;
    if (handled) event.preventDefault();
  };

  // Keep the active option in view in a list that scrolls.
  useEffect(() => {
    if (!open || activeValue === undefined) return;
    const list = panel.current;
    const option = list?.querySelector<HTMLElement>(`[id="${optionId(activeValue)}"]`);
    if (!list || !option) return;
    // The list's own padding counts, so the first and last options show it.
    const padding = Number.parseFloat(getComputedStyle(list).paddingTop);
    const top = option.offsetTop - padding;
    const bottom = option.offsetTop + option.offsetHeight + padding;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  });

  const context: SelectContextValue = {
    selected: selected?.value,
    activeValue: open ? activeValue : undefined,
    optionId,
    choose,
    activate: setActiveValue,
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut that opens the list when anywhere on the field is pressed; the keyboard works on the combobox input inside.
    // biome-ignore lint/a11y/useKeyWithClickEvents: as above; the keys are handled by the input.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: as above.
    <div
      ref={root}
      className={cx(styles.root, className)}
      style={{ '--_anchor': popover.anchorName } as CSSProperties}
      data-open={open ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      onClick={(event) => {
        if (disabled || !(event.target as Element).closest('[data-slot="field"]')) return;
        if (open) close();
        else openWith('selected');
      }}
    >
      <TextField
        {...rest}
        variant={variant}
        disabled={disabled}
        readOnly
        value={selected?.text ?? ''}
        trailingIcon={
          <span className={styles.arrow} aria-hidden="true">
            <ArrowGlyph />
          </span>
        }
        // The input is the combobox, which the platform would call a text box.
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeValue !== undefined ? optionId(activeValue) : undefined
        }
        autoComplete="off"
        inputMode="none"
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          (onBlur as ((event: unknown) => void) | undefined)?.(event);
          close();
        }}
      />
      {name ? <input type="hidden" name={name} value={value ?? ''} disabled={disabled} /> : null}
      <SelectContext value={context}>
        <div
          ref={(node) => {
            panel.current = node;
            (popover.ref as { current: HTMLElement | null }).current = node;
          }}
          id={listboxId}
          popover="manual"
          role="listbox"
          aria-label={typeof rest.label === 'string' ? rest.label : rest['aria-label']}
          className={cx(menu.root, menuTokens.root, menuTokens.standard, styles.panel)}
          style={popover.popoverStyle}
          data-placement="bottom-start"
          // A press in the list keeps the focus on the field.
          onMouseDown={(event) => event.preventDefault()}
        >
          {children}
        </div>
      </SelectContext>
    </div>
  );
}
