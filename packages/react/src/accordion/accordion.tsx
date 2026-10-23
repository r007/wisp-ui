'use client';

import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  Fragment,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  use,
  useId,
  useMemo,
} from 'react';
import { cx } from '../foundation/cx.js';
import focus from '../foundation/focus-ring.module.css';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import styles from './accordion.module.css';

export type AccordionVariant = 'segmented' | 'flat';

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
  /** Whether a panel is a landmark `region`: not when many can be open, which litters the page. */
  regions: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

/** More panels than this that can be open at once make a `region` landmark each too many. */
const MAX_REGIONS = 6;

const ChevronGlyph = () => (
  <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false" className={styles.chevron}>
    <path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z" />
  </svg>
);

export interface AccordionItemProps
  extends Omit<ComponentPropsWithRef<'div'>, 'title' | 'children'> {
  /** Identifies the item in the accordion's `value`. It must be unique in the accordion. */
  value: string;
  /** The header: the item's name, which is the button that opens it. */
  title: ReactNode;
  /** A second line under the title, while the item is closed or open. */
  supportingText?: ReactNode;
  /** A 24px icon before the title. Decorative. */
  leading?: ReactNode;
  disabled?: boolean;
  /**
   * The level of the heading around the header button, for the page's outline: 2 to 6.
   * @default 3
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** What the item reveals. */
  children: ReactNode;
}

/** One item of an `Accordion`: a header that opens and closes a panel of content. */
export function AccordionItem({
  value,
  title,
  supportingText,
  leading,
  disabled = false,
  headingLevel = 3,
  children,
  className,
  ...rest
}: AccordionItemProps) {
  const context = use(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used inside <Accordion>.');
  const id = useId();
  const headerId = `${id}-header`;
  const panelId = `${id}-panel`;
  const open = context.isOpen(value);
  const { surfaceRef, controlRef } = useStateLayer<HTMLButtonElement>({ disabled });
  const Heading = `h${headingLevel}` as const;

  return (
    <div
      {...rest}
      className={cx(styles.item, className)}
      data-slot="item"
      data-open={open ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-leading={leading ? '' : undefined}
    >
      <Heading className={styles.heading}>
        <button
          ref={controlRef}
          id={headerId}
          type="button"
          className={cx(styles.header, focus.focusRing)}
          data-slot="header"
          aria-expanded={open}
          aria-controls={panelId}
          disabled={disabled}
          onClick={() => context.toggle(value)}
        >
          <StateLayer ref={surfaceRef} />
          {leading ? (
            <span className={styles.leading} aria-hidden="true">
              {leading}
            </span>
          ) : null}
          <span className={styles.text}>
            <span className={styles.title}>{title}</span>
            {supportingText ? <span className={styles.supporting}>{supportingText}</span> : null}
          </span>
          <ChevronGlyph />
        </button>
      </Heading>
      <div
        id={panelId}
        {...(context.regions ? { role: 'region', 'aria-labelledby': headerId } : {})}
        className={styles.panel}
        data-slot="panel"
        // A closed panel is still in the DOM, so it can fold away; it is out of the tab order
        // and the accessibility tree until it opens.
        inert={open ? undefined : true}
      >
        <div className={styles.clip}>
          <div className={styles.content} data-slot="content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface AccordionProps extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue'> {
  /** The `AccordionItem`s. */
  children: ReactNode;
  /**
   * `segmented`: each item is its own surface, in a group with small gaps and rounder ends, and the
   * open one rounds all its corners. `flat`: no surface, a rule between items.
   * @default 'segmented'
   */
  variant?: AccordionVariant;
  /** Whether several items can be open at once. Otherwise opening one closes the others. @default false */
  multiple?: boolean;
  /** The `value`s of the open items. Controlled when defined. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  /** Called with the `value`s of the open items after one is opened or closed. */
  onValueChange?: (value: string[]) => void;
}

/** How many items are in `children`, looking through fragments. */
function countItems(children: ReactNode): number {
  let count = 0;
  for (const child of Children.toArray(children)) {
    if (isValidElement(child)) {
      if (child.type === Fragment)
        count += countItems((child.props as { children?: ReactNode }).children);
      else if (child.type === AccordionItem) count++;
    }
  }
  return count;
}

/**
 * A stack of headers that each open and close a panel of content, following the WAI-ARIA
 * accordion pattern: every header is a button inside a heading, the panel it opens is a region
 * named by it, and the arrow keys, Home and End move between the headers.
 *
 * ```tsx
 * <Accordion defaultValue={['shipping']}>
 *   <AccordionItem value="shipping" title="Shipping">Free over $50.</AccordionItem>
 *   <AccordionItem value="returns" title="Returns">Within 30 days.</AccordionItem>
 * </Accordion>
 * ```
 */
export function Accordion({
  children,
  variant = 'segmented',
  multiple = false,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  className,
  onKeyDown,
  ...rest
}: AccordionProps) {
  const [open, setOpen] = useControllableState<readonly string[]>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange as ((next: readonly string[]) => void) | undefined,
  });

  const context = useMemo<AccordionContextValue>(
    () => ({
      isOpen: (item) => open.includes(item),
      toggle: (item) => {
        if (open.includes(item)) setOpen(open.filter((v) => v !== item));
        else setOpen(multiple ? [...open, item] : [item]);
      },
      regions: !multiple || countItems(children) <= MAX_REGIONS,
    }),
    [open, setOpen, multiple, children],
  );

  /** Arrow keys, Home and End move the focus between the headers of this accordion. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.dataset.slot !== 'header') return;
    const root = event.currentTarget;
    const headers = [...root.querySelectorAll<HTMLButtonElement>('[data-slot="header"]')].filter(
      (header) => !header.disabled && header.closest('[data-slot="accordion"]') === root,
    );
    const from = headers.indexOf(target as HTMLButtonElement);
    if (from === -1) return;
    let to: number;
    switch (event.key) {
      case 'ArrowDown':
        to = (from + 1) % headers.length;
        break;
      case 'ArrowUp':
        to = (from - 1 + headers.length) % headers.length;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = headers.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    headers[to]?.focus();
  };

  return (
    <AccordionContext value={context}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the keys are pressed on the header buttons inside, which take the focus; this one listener moves it between them. */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: as above. */}
      <div
        {...rest}
        className={cx(styles.root, className)}
        data-slot="accordion"
        data-variant={variant}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </AccordionContext>
  );
}
