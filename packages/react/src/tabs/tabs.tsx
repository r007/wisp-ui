'use client';

import {
  type ComponentPropsWithRef,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import { useWheelScroll } from '../foundation/use-wheel-scroll.js';
import styles from './tabs.module.css';
import tokens from './tabs.tokens.generated.module.css';

export type TabsVariant = 'primary' | 'secondary';
export type TabsActivation = 'automatic' | 'manual';

interface TabsContextValue {
  value: string | undefined;
  select: (value: string) => void;
  baseId: string;
  activation: TabsActivation;
  /** The values that have a panel, so a tab only points at a panel that exists. */
  panels: ReadonlySet<string>;
  registerPanel: (value: string) => () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

/** Tab and panel ids are derived from the tab's value, which may hold any characters. */
const slug = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

function useTabs() {
  const context = use(TabsContext);
  if (!context) throw new Error('Tab, TabList and TabPanel must be used inside <Tabs>.');
  return context;
}

export interface TabsProps extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'onChange'> {
  /** The selected tab's `value`. Controlled when defined. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * `automatic` selects a tab as soon as the arrow keys focus it. `manual` waits for Enter or
   * Space, for when showing a panel is slow.
   * @default 'automatic'
   */
  activation?: TabsActivation;
}

/**
 * Groups a `TabList` and its `TabPanel`s and holds which tab is selected.
 *
 * ```tsx
 * <Tabs defaultValue="flights">
 *   <TabList aria-label="Trips">
 *     <Tab value="flights">Flights</Tab>
 *     <Tab value="hotels">Hotels</Tab>
 *   </TabList>
 *   <TabPanel value="flights">…</TabPanel>
 *   <TabPanel value="hotels">…</TabPanel>
 * </Tabs>
 * ```
 */
export function Tabs({
  value: valueProp,
  defaultValue,
  onValueChange,
  activation = 'automatic',
  ...rest
}: TabsProps) {
  const baseId = useId();
  const [value, select] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue,
    onChange: (next) => next !== undefined && onValueChange?.(next),
  });
  const [panels, setPanels] = useState<ReadonlySet<string>>(() => new Set());
  const registerPanel = useCallback((panel: string) => {
    setPanels((current) => new Set(current).add(panel));
    return () =>
      setPanels((current) => {
        const next = new Set(current);
        next.delete(panel);
        return next;
      });
  }, []);
  const context = useMemo<TabsContextValue>(
    () => ({
      value,
      select: select as (next: string) => void,
      baseId,
      activation,
      panels,
      registerPanel,
    }),
    [value, select, baseId, activation, panels, registerPanel],
  );
  return (
    <TabsContext value={context}>
      <div {...rest} />
    </TabsContext>
  );
}

export interface TabListProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  /** Primary tabs sit under a top app bar and have a content-wide indicator; secondary tabs subdivide content and have a full-width one. @default 'primary' */
  variant?: TabsVariant;
  /** Tabs take the width of their content and the list scrolls, instead of sharing the width equally. */
  scrollable?: boolean;
  /** Names the tab list. */
  'aria-label'?: string;
}

const TABS = '[role="tab"]:not(:disabled)';

/** The row of tabs, with the indicator that slides to the selected one. */
export function TabList({
  variant = 'primary',
  scrollable = false,
  className,
  children,
  ref,
  onKeyDown,
  ...rest
}: TabListProps) {
  const { value, select, activation } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(listRef, ref);
  // A mouse wheel only turns vertically, and the scrollbar is hidden.
  useWheelScroll(listRef);

  /** The tab with this value, found by its `data-value` (values may hold any characters). */
  const find = useCallback((selected: string | undefined) => {
    if (selected === undefined) return null;
    return listRef.current?.querySelector<HTMLElement>(
      `[role="tab"][data-value="${CSS.escape(selected)}"]`,
    );
  }, []);

  // The indicator moves between tabs of different widths, so it is measured, not computed.
  const measure = useCallback(
    (selected: string | undefined) => {
      const list = listRef.current;
      if (!list) return;
      const tab = find(selected);
      // A primary indicator is as wide as the tab's content; a secondary one as the tab.
      const target =
        tab && variant === 'primary'
          ? (tab.querySelector<HTMLElement>('[data-slot="content"]') ?? tab)
          : tab;
      if (!target) {
        list.style.setProperty('--_w', '0px');
        return;
      }
      const rtl = getComputedStyle(list).direction === 'rtl';
      const box = list.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      // Offset from the start edge, in the scrolled content.
      const x = rtl
        ? box.right - rect.right - list.scrollLeft
        : rect.left - box.left + list.scrollLeft;
      list.style.setProperty('--_x', `${x}px`);
      list.style.setProperty('--_w', `${rect.width}px`);
    },
    [find, variant],
  );

  useLayoutEffect(() => {
    measure(value);
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => measure(value));
    observer.observe(list);
    for (const tab of list.querySelectorAll('[role="tab"]')) observer.observe(tab);
    return () => observer.disconnect();
  }, [measure, value]);

  // Keep the selected tab in view in a scrolling list.
  useLayoutEffect(() => {
    find(value)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [find, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLElement>(TABS) ?? []);
    const index = tabs.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    let next: HTMLElement | undefined;
    if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) next = tabs[(index + 1) % tabs.length];
    else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft'))
      next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === 'Home') next = tabs[0];
    else if (event.key === 'End') next = tabs.at(-1);
    else return;
    event.preventDefault();
    next?.focus();
    if (next && activation === 'automatic' && next.dataset.value !== undefined)
      select(next.dataset.value);
  };

  return (
    <div
      {...rest}
      ref={mergedRef}
      role="tablist"
      className={cx(styles.list, tokens[variant], className)}
      data-variant={variant}
      data-scrollable={scrollable ? '' : undefined}
      onKeyDown={handleKeyDown}
    >
      {children}
      <span className={styles.indicator} aria-hidden="true" />
    </div>
  );
}

export interface TabProps
  extends Omit<ComponentPropsWithRef<'button'>, 'role' | 'value' | 'children' | 'type'> {
  /** Identifies this tab; compared with the selected value, and ties it to its panel. */
  value: string;
  /** An icon, 24px. With a label on a primary tab it sits above it. Decorative. */
  icon?: ReactNode;
  /** The label. An icon-only tab needs `aria-label`. */
  children?: ReactNode;
}

/** One tab in a `TabList`. */
export function Tab({
  value,
  icon,
  children,
  className,
  disabled,
  onClick,
  ref,
  ...rest
}: TabProps) {
  const { value: selectedValue, select, baseId, panels } = useTabs();
  const selected = selectedValue === value;
  const { controlRef, surfaceRef } = useStateLayer<HTMLButtonElement>({
    disabled: Boolean(disabled),
  });
  const mergedRef = useMergedRef(controlRef, ref);
  const stacked = Boolean(icon) && children !== undefined && children !== null;

  return (
    <button
      {...rest}
      ref={mergedRef}
      type="button"
      role="tab"
      id={`${baseId}-tab-${slug(value)}`}
      aria-selected={selected}
      aria-controls={panels.has(value) ? `${baseId}-panel-${slug(value)}` : undefined}
      // Roving focus: only the selected tab is in the tab order; the arrows move between tabs.
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      className={cx(styles.tab, className)}
      data-value={value}
      data-stacked={stacked ? '' : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) select(value);
      }}
    >
      <StateLayer ref={surfaceRef} />
      <span className={styles.content} data-slot="content">
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {children !== undefined && children !== null ? <span>{children}</span> : null}
      </span>
    </button>
  );
}

export interface TabPanelProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  /** The `value` of the tab this panel belongs to. */
  value: string;
}

/** The content of a tab, shown while that tab is selected. */
export function TabPanel({ value, className, ...rest }: TabPanelProps) {
  const { value: selectedValue, baseId, registerPanel } = useTabs();
  const selected = selectedValue === value;
  useEffect(() => registerPanel(value), [registerPanel, value]);
  return (
    <div
      {...rest}
      role="tabpanel"
      id={`${baseId}-panel-${slug(value)}`}
      aria-labelledby={`${baseId}-tab-${slug(value)}`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the WAI-ARIA tabs pattern makes the panel a tab stop, so keyboard users can reach content that has nothing focusable of its own.
      tabIndex={0}
      hidden={!selected}
      className={cx(styles.panel, className)}
    />
  );
}
