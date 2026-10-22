'use client';

import {
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import styles from './toolbar.module.css';
import tokens from './toolbar.tokens.generated.module.css';

export type ToolbarVariant = 'docked' | 'floating';
export type ToolbarScheme = 'standard' | 'vibrant';

export interface ToolbarProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  /** `docked` is a full-width bar; `floating` is a pill with a shadow. @default 'docked' */
  variant?: ToolbarVariant;
  /** `standard` is a neutral surface; `vibrant` a primary container. @default 'standard' */
  scheme?: ToolbarScheme;
  /** A floating toolbar can stand vertically, at a screen edge. @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  /** A FAB beside a floating toolbar, 8px away. */
  fab?: ReactNode;
  /** Names the toolbar. */
  'aria-label': string;
}

const CONTROLS = 'button:not(:disabled), a[href], [role="button"]:not([aria-disabled="true"])';

/**
 * A toolbar: a row of related controls, usually `IconButton`s. It follows the WAI-ARIA toolbar
 * pattern: one tab stop, with the arrow keys (and Home and End) moving between the controls.
 *
 * ```tsx
 * <Toolbar aria-label="Text formatting">
 *   <IconButton aria-label="Bold"><BoldIcon /></IconButton>
 *   <IconButton aria-label="Italic"><ItalicIcon /></IconButton>
 * </Toolbar>
 * ```
 *
 * `IconButton`s take the toolbar's colours, and a toggled one (`selected`) gets its selected
 * container.
 */
export function Toolbar({
  variant = 'docked',
  scheme = 'standard',
  orientation = 'horizontal',
  fab,
  className,
  ref,
  onKeyDown,
  onFocus,
  children,
  ...rest
}: ToolbarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(rootRef, ref);
  const vertical = variant === 'floating' && orientation === 'vertical';

  const controls = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>(CONTROLS) ?? []);

  // One tab stop: the first control, until focus moves. The rest are reached with the arrow keys.
  // The controls are the consumer's, rendered after this component, so this runs every render.
  useEffect(() => {
    const all = controls();
    if (all.length === 0) return;
    const stop = all.find((el) => el.getAttribute('tabindex') === '0') ?? all[0];
    for (const el of all) el.setAttribute('tabindex', el === stop ? '0' : '-1');
  });

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    const target = event.target as HTMLElement;
    if (!target.matches(CONTROLS)) return;
    for (const el of controls()) el.setAttribute('tabindex', el === target ? '0' : '-1');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const all = controls();
    const index = all.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    let next: HTMLElement | undefined;
    if (event.key === forward) next = all[(index + 1) % all.length];
    else if (event.key === back) next = all[(index - 1 + all.length) % all.length];
    else if (event.key === 'Home') next = all[0];
    else if (event.key === 'End') next = all.at(-1);
    else return;
    event.preventDefault();
    next?.focus();
  };

  const toolbar = (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: a toolbar is a composite widget; the WAI-ARIA pattern has it handle arrow keys for the controls inside it.
    <div
      {...rest}
      ref={mergedRef}
      role="toolbar"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      className={cx(styles.root, tokens.root, tokens[scheme], className)}
      data-variant={variant}
      data-orientation={vertical ? 'vertical' : 'horizontal'}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      {children}
    </div>
  );

  return fab && variant === 'floating' ? (
    <div
      className={cx(styles.group, tokens.root)}
      data-orientation={vertical ? 'vertical' : 'horizontal'}
    >
      {toolbar}
      {fab}
    </div>
  ) : (
    toolbar
  );
}
