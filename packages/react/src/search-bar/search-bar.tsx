'use client';

import type { ChangeEvent, ComponentPropsWithRef, KeyboardEvent, ReactNode, Ref } from 'react';
import { cx } from '../foundation/cx.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import styles from './search-bar.module.css';
import tokens from './search-bar.tokens.generated.module.css';

interface SearchBarOwnProps {
  /** The text. Controlled when defined. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the text when Enter is pressed. */
  onSearch?: (value: string) => void;
  /** The icon at the start. A magnifier unless given; `null` for none. Decorative. */
  leading?: ReactNode;
  /** Actions at the end: `IconButton`s, or an avatar. */
  trailing?: ReactNode;
  /** Class for the bar. Everything else is passed to the input. */
  className?: string;
  /** Names the field: there is no visible label, only the placeholder. */
  'aria-label': string;
  ref?: Ref<HTMLInputElement>;
}

export type SearchBarProps = SearchBarOwnProps &
  Omit<
    ComponentPropsWithRef<'input'>,
    keyof SearchBarOwnProps | 'type' | 'size' | 'children' | 'role'
  >;

const MagnifierIcon = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.500-75.500T120-580q0-109 75.500-184.500T380-840q109 0 184.500 75.500T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.500-52.500T560-580q0-75-52.500-127.500T380-760q-75 0-127.500 52.500T200-580q0 75 52.500 127.500T380-400Z" />
  </svg>
);

/**
 * A search bar: a pill holding a magnifier, a text input and actions.
 *
 * ```tsx
 * <SearchBar
 *   aria-label="Search recipes"
 *   placeholder="Search recipes"
 *   onSearch={(query) => find(query)}
 *   trailing={<IconButton aria-label="Voice search"><MicIcon /></IconButton>}
 * />
 * ```
 *
 * For a bar that opens into suggestions and results, use `Search`.
 */
export function SearchBar({
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onSearch,
  leading,
  trailing,
  className,
  onChange,
  onKeyDown,
  ref,
  ...rest
}: SearchBarProps) {
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    setValue(event.target.value);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.key === 'Enter' && !event.defaultPrevented) onSearch?.(value);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: `<search>` is not yet exposed as a landmark by every browser and screen reader, `role="search"` on a `div` is.
    <div role="search" className={cx(styles.root, tokens.root, className)}>
      {leading === null ? null : (
        <span className={styles.leading} aria-hidden="true">
          {leading ?? <MagnifierIcon />}
        </span>
      )}
      <input
        enterKeyHint="search"
        autoComplete="off"
        {...rest}
        ref={ref}
        type="search"
        className={styles.input}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.trailing}>{trailing}</div>
    </div>
  );
}
