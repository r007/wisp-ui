'use client';

import {
  Children,
  type CSSProperties,
  createContext,
  Fragment,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
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
import visuallyHidden from '../foundation/visually-hidden.module.css';
import list from '../list/list.module.css';
import menu from '../menu/menu.module.css';
import menuTokens from '../menu/menu.tokens.generated.module.css';
import { TextField, type TextFieldProps } from '../text-field/text-field.js';
import styles from './autocomplete.module.css';

const ArrowGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M480-360 280-559h400L480-360Z" />
  </svg>
);

const CloseGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
  </svg>
);

/** Text with its case and accents set aside, so "café" is found by "CAFE". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** An option, as a filter sees it. */
export interface AutocompleteFilterOption {
  value: string;
  /** What the option says: its `textValue`, or its children when those are plain text. */
  text: string;
}

/** Whether an option is offered for what has been typed. */
export type AutocompleteFilter = (option: AutocompleteFilterOption, query: string) => boolean;

const containsQuery: AutocompleteFilter = (option, query) =>
  fold(option.text).includes(fold(query));

/** Why the text in the field changed. */
export type AutocompleteInputReason = 'input' | 'select' | 'clear' | 'reset';

interface OptionInfo extends AutocompleteFilterOption {
  disabled: boolean;
  element: ReactElement<AutocompleteOptionProps>;
}

interface AutocompleteContextValue {
  selected: string | null;
  activeValue: string | undefined;
  /** What has been typed, while it narrows the options; empty otherwise. */
  query: string;
  optionId: (value: string) => string;
  choose: (value: string) => void;
  activate: (value: string) => void;
}

const AutocompleteContext = createContext<AutocompleteContextValue | null>(null);

export interface AutocompleteOptionProps {
  /** What is chosen when this option is. It must be unique among the options. */
  value: string;
  /** The option's label. */
  children: ReactNode;
  /**
   * The text the field shows once this is chosen, and that typing is matched against. Needed
   * when `children` is not a plain string or number.
   */
  textValue?: string;
  /** A 20px icon before the label. Decorative. */
  leading?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** The text of an option: `textValue`, else its children when they are a string or a number. */
const textOf = ({ textValue, children }: Pick<AutocompleteOptionProps, 'textValue' | 'children'>) =>
  textValue ??
  (typeof children === 'string' || typeof children === 'number' ? String(children) : '');

/** `text` with the part that matches `query` in bold, when it can be told where that is. */
function emphasize(text: string, query: string): ReactNode {
  const needle = fold(query);
  const folded = fold(text);
  const at = folded.indexOf(needle);
  // Folding can change the length (an accent that is a letter plus a mark); then say nothing.
  if (!needle || at < 0 || folded.length !== text.length) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className={styles.match} data-match="">
        {text.slice(at, at + needle.length)}
      </span>
      {text.slice(at + needle.length)}
    </>
  );
}

/** One suggestion in an `Autocomplete`. Put it directly in the `Autocomplete`, or in a fragment in it. */
export function AutocompleteOption({
  value,
  children,
  leading,
  disabled = false,
  className,
}: AutocompleteOptionProps) {
  const context = use(AutocompleteContext);
  if (!context) throw new Error('AutocompleteOption must be used inside <Autocomplete>.');
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
        <span className={list.headline}>
          {typeof children === 'string' && context.query
            ? emphasize(children, context.query)
            : children}
        </span>
      </span>
    </div>
  );
}

export interface AutocompleteProps
  extends Omit<
    TextFieldProps,
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'onValueChange'
    | 'type'
    | 'multiline'
    | 'rows'
    | 'children'
    | 'trailingIcon'
    | 'prefixText'
    | 'suffixText'
    | 'counter'
    | 'maxLength'
  > {
  /**
   * What is chosen: the `value` of an option, or `null` for nothing. With `freeSolo`, the text
   * the user committed when they did not choose an option. Controlled when defined.
   */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with what was chosen, or `null` when it was cleared. */
  onValueChange?: (value: string | null) => void;
  /** The text in the field. Controlled when defined. Without it, the field shows the chosen option. */
  inputValue?: string;
  defaultInputValue?: string;
  /** Called when the text in the field changes, with the reason: typed, an option chosen, cleared, or put back. */
  onInputValueChange?: (inputValue: string, reason: AutocompleteInputReason) => void;
  /** The `AutocompleteOption`s, directly or in fragments. */
  children: ReactNode;
  /**
   * Which options to offer for what is typed. By default those that contain it, ignoring case and
   * accents. `false` offers them all, for when you filter (or search a server) yourself and pass
   * only the options to show.
   */
  filter?: false | AutocompleteFilter;
  /**
   * Lets the user commit text that is not an option: Enter, or leaving the field, makes it the
   * `value`. The options are then suggestions. @default false
   */
  freeSolo?: boolean;
  /** Shows `loadingText` under the options, for when they are on their way. */
  loading?: boolean;
  /** @default 'Loading…' */
  loadingText?: string;
  /** Shown when no option matches. Empty to show nothing. @default 'No results' */
  emptyText?: string;
  /** What a screen reader is told about the matches, as the list changes. @default '3 results available' */
  resultsText?: (count: number) => string;
  /** Shows a button that clears the field when it has text. @default true */
  clearable?: boolean;
  /** @default 'Clear' */
  clearLabel?: string;
  /** Names the button that opens the list, which has no arrow with `freeSolo`. @default 'Show options' */
  openLabel?: string;
  /** @default 'Hide options' */
  closeLabel?: string;
  /** Opens the list when the field gets the focus. @default false */
  openOnFocus?: boolean;
  /** Highlights the first match as the user types, so Enter chooses it. @default false */
  autoHighlight?: boolean;
  /** Submitted with a form, as a hidden field of this name. */
  name?: string;
}

const isOption = (node: ReactNode): node is ReactElement<AutocompleteOptionProps> =>
  isValidElement(node) && typeof (node.props as { value?: unknown }).value === 'string';

/** The options in `children`, looking through fragments and arrays, in order. */
function collectOptions(children: ReactNode): ReactElement<AutocompleteOptionProps>[] {
  return Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment)
      return collectOptions((child.props as { children?: ReactNode }).children);
    return isOption(child) ? [child] : [];
  });
}

const defaultResultsText = (count: number) =>
  `${count} ${count === 1 ? 'result' : 'results'} available`;

/**
 * A text field that suggests options as you type, following the WAI-ARIA editable combobox
 * pattern with a list: the focus stays in the field, which names the active option with
 * `aria-activedescendant`. Typing narrows the options, the arrow keys move through them, Enter
 * chooses, Escape closes (and, once closed, clears). It is a `TextField`, with all of its label,
 * supporting text and error behaviour:
 *
 * ```tsx
 * <Autocomplete label="Country" value={country} onValueChange={setCountry}>
 *   <AutocompleteOption value="de">Germany</AutocompleteOption>
 *   <AutocompleteOption value="fr">France</AutocompleteOption>
 * </Autocomplete>
 * ```
 *
 * Leaving the field puts back the text of the chosen option, or with `freeSolo` keeps what was
 * typed. To fetch suggestions yourself, pass `filter={false}`, the options you got, and `loading`.
 */
export function Autocomplete({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  inputValue: inputValueProp,
  defaultInputValue,
  onInputValueChange,
  children,
  filter,
  freeSolo = false,
  loading = false,
  loadingText = 'Loading…',
  emptyText = 'No results',
  resultsText = defaultResultsText,
  clearable = true,
  clearLabel = 'Clear',
  openLabel = 'Show options',
  closeLabel = 'Hide options',
  openOnFocus = false,
  autoHighlight = false,
  name,
  variant = 'filled',
  disabled,
  readOnly,
  className,
  onKeyDown,
  onBlur,
  onFocus,
  onClick,
  ...rest
}: AutocompleteProps) {
  const options: OptionInfo[] = useMemo(
    () =>
      collectOptions(children).map((element) => ({
        value: element.props.value,
        disabled: element.props.disabled === true,
        text: textOf(element.props),
        element,
      })),
    [children],
  );

  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  // The text of the option last chosen, for when it is no longer among the options (they were
  // fetched again, say) but the field still has to say it.
  const chosen = useRef<{ value: string; text: string } | null>(null);
  const textOfValue = (of: string | null): string => {
    if (of === null) return '';
    const option = options.find((o) => o.value === of);
    if (option) return option.text;
    if (chosen.current?.value === of) return chosen.current.text;
    return freeSolo ? of : '';
  };

  const [inputValue, setInputValueState] = useControllableState<string>({
    value: inputValueProp,
    defaultValue: defaultInputValue ?? textOfValue(value),
    onChange: undefined,
  });
  const setInput = (text: string, reason: AutocompleteInputReason) => {
    setInputValueState(text);
    onInputValueChange?.(text, reason);
  };

  const [open, setOpen] = useState(false);
  /** Whether the user has typed since an option was chosen: only then does the text narrow the options. */
  const [typed, setTyped] = useState(false);
  const [activeValue, setActiveValue] = useState<string | undefined>(undefined);
  const id = useId();
  const listboxId = `${id}-listbox`;
  const optionId = (optionValue: string) => `${id}-option-${optionValue.replace(/\W/g, '_')}`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  const inactive = disabled || readOnly;
  const query = typed ? inputValue : '';
  const matches = filter === false ? null : (filter ?? containsQuery);
  const shown = matches && query ? options.filter((option) => matches(option, query)) : options;
  const enabled = shown.filter((option) => !option.disabled);
  const activeOption =
    enabled.find((option) => option.value === activeValue) ??
    (autoHighlight && typed && query ? enabled[0] : undefined);
  const selected = options.find((option) => option.value === value);

  const status = loading ? loadingText : shown.length === 0 ? emptyText : '';
  const hasContent = shown.length > 0 || status !== '';
  const expanded = open && !inactive && hasContent;

  // Something else changed the value (the parent, a clear): the field says what it now is.
  const previousValue = useRef(value);
  useEffect(() => {
    if (previousValue.current === value) return;
    previousValue.current = value;
    setTyped(false);
    const text = textOfValue(value);
    if (text !== inputValue) setInput(text, 'reset');
  });

  // A choice the parent did not take (a controlled `value` it left alone): the field goes back to
  // saying what the value is, rather than the option that was only asked for.
  const pendingChoice = useRef<string | null>(null);
  useEffect(() => {
    if (pendingChoice.current === null) return;
    const asked = pendingChoice.current;
    pendingChoice.current = null;
    if (value !== asked) setInput(textOfValue(value), 'reset');
  });

  const popover = usePopover({
    open: expanded,
    onOpenChange: (next) => {
      if (!next) setOpen(false);
    },
    ignore: [root],
  });

  const close = () => {
    setOpen(false);
    setActiveValue(undefined);
  };

  const openList = (target?: 'selected' | 'first' | 'last') => {
    if (inactive) return;
    setOpen(true);
    // On the chosen option, if there is one in the list; otherwise nothing is highlighted yet.
    if (target === 'selected') {
      setActiveValue(
        selected && !selected.disabled && enabled.includes(selected) ? selected.value : undefined,
      );
    } else if (target === 'first') setActiveValue(enabled[0]?.value);
    else if (target === 'last') setActiveValue(enabled.at(-1)?.value);
  };

  /** Where the arrow keys and the button open the list: on the chosen option, else on the first. */
  const opensOn = () => (!typed && selected ? 'selected' : 'first');

  const choose = (next: string) => {
    const option = options.find((o) => o.value === next);
    const text = option?.text ?? next;
    chosen.current = { value: next, text };
    pendingChoice.current = next;
    setValue(next);
    setInput(text, 'select');
    setTyped(false);
    close();
  };

  /** With `freeSolo`: the text is the value (or nothing, when it is empty). */
  const commitText = () => {
    const next = inputValue === '' ? null : inputValue;
    if (next !== value) setValue(next);
    setTyped(false);
  };

  /** Without `freeSolo`: put back the text of what is chosen, or let go of it when the text was emptied. */
  const putBack = () => {
    setTyped(false);
    const text = textOfValue(value);
    if (text !== inputValue) setInput(text, 'reset');
  };

  const clear = () => {
    setInput('', 'clear');
    setTyped(false);
    if (value !== null) setValue(null);
    input.current?.focus();
  };

  /** Moves the active option by `step` along the options that can be chosen. */
  const move = (step: number) => {
    const current = enabled.findIndex((option) => option.value === activeOption?.value);
    const next = Math.min(Math.max(current + step, 0), enabled.length - 1);
    setActiveValue(enabled[next]?.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    (onKeyDown as ((event: KeyboardEvent<HTMLInputElement>) => void) | undefined)?.(event);
    if (event.defaultPrevented || inactive) return;
    const { key } = event;
    let handled = true;
    if (key === 'ArrowDown') {
      if (event.altKey) openList();
      else if (!expanded) openList(opensOn());
      else move(1);
    } else if (key === 'ArrowUp') {
      if (event.altKey) close();
      else if (!expanded) openList('last');
      else move(-1);
    } else if (key === 'PageDown' && expanded) move(10);
    else if (key === 'PageUp' && expanded) move(-10);
    else if (key === 'Enter') {
      if (expanded && activeOption) choose(activeOption.value);
      else if (freeSolo && inputValue !== '') {
        commitText();
        close();
      } else handled = false;
    } else if (key === 'Escape') {
      if (expanded) close();
      else if (clearable && inputValue !== '') clear();
      else handled = false;
    } else if (key === 'Tab') {
      close();
      handled = false;
    } else handled = false;
    if (handled) event.preventDefault();
  };

  // Keep the active option in view in a list that scrolls.
  useEffect(() => {
    if (!expanded || !activeOption) return;
    const listbox = panel.current;
    const element = listbox?.querySelector<HTMLElement>(`[id="${optionId(activeOption.value)}"]`);
    if (!listbox || !element) return;
    // The list's own padding counts, so the first and last options show it.
    const padding = Number.parseFloat(getComputedStyle(listbox).paddingTop);
    const top = element.offsetTop - padding;
    const bottom = element.offsetTop + element.offsetHeight + padding;
    if (top < listbox.scrollTop) listbox.scrollTop = top;
    else if (bottom > listbox.scrollTop + listbox.clientHeight)
      listbox.scrollTop = bottom - listbox.clientHeight;
  });

  const context: AutocompleteContextValue = {
    selected: value,
    activeValue: expanded ? activeOption?.value : undefined,
    query,
    optionId,
    choose,
    activate: setActiveValue,
  };

  const keepFocus = (event: MouseEvent) => event.preventDefault();

  return (
    <div
      ref={root}
      className={cx(styles.root, className)}
      style={{ '--_anchor': popover.anchorName } as CSSProperties}
      data-open={expanded ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
    >
      <TextField
        {...rest}
        ref={input}
        variant={variant}
        disabled={disabled}
        readOnly={readOnly}
        value={inputValue}
        onValueChange={(text) => {
          setInput(text, 'input');
          setTyped(true);
          setActiveValue(undefined);
          if (!open) setOpen(true);
          // Emptying the field lets go of what was chosen.
          if (text === '' && !freeSolo && value !== null) setValue(null);
        }}
        trailingIcon={
          disabled ? undefined : (
            <span className={styles.actions}>
              {clearable && inputValue !== '' && !readOnly ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={clearLabel}
                  className={styles.action}
                  data-slot="clear"
                  onMouseDown={keepFocus}
                  onClick={clear}
                >
                  <CloseGlyph />
                </button>
              ) : null}
              {freeSolo ? null : (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={expanded ? closeLabel : openLabel}
                  aria-expanded={expanded}
                  aria-controls={listboxId}
                  disabled={readOnly}
                  className={cx(styles.action, styles.arrow)}
                  data-slot="toggle"
                  onMouseDown={keepFocus}
                  onClick={() => {
                    if (expanded) close();
                    else {
                      input.current?.focus();
                      openList(opensOn());
                    }
                  }}
                >
                  <ArrowGlyph />
                </button>
              )}
            </span>
          )
        }
        // The input is the combobox, which the platform would call a text box.
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={expanded && activeOption ? optionId(activeOption.value) : undefined}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        onKeyDown={handleKeyDown}
        onFocus={(event) => {
          (onFocus as ((event: unknown) => void) | undefined)?.(event);
          if (openOnFocus) openList();
        }}
        onClick={(event) => {
          (onClick as ((event: unknown) => void) | undefined)?.(event);
          if (!open) openList('selected');
        }}
        onBlur={(event) => {
          (onBlur as ((event: unknown) => void) | undefined)?.(event);
          close();
          if (freeSolo) commitText();
          else putBack();
        }}
      />
      {name ? <input type="hidden" name={name} value={value ?? ''} disabled={disabled} /> : null}
      <span
        className={visuallyHidden.visuallyHidden}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {expanded ? status || resultsText(shown.length) : ''}
      </span>
      <AutocompleteContext value={context}>
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
          onMouseDown={keepFocus}
        >
          {shown.map((option) => option.element)}
          {status ? (
            <div className={styles.status} aria-hidden="true" data-slot="status">
              {status}
            </div>
          ) : null}
        </div>
      </AutocompleteContext>
    </div>
  );
}
