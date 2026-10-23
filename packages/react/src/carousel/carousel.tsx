'use client';

import {
  Children,
  type ComponentPropsWithRef,
  type CSSProperties,
  createContext,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import { cx } from '../foundation/cx.js';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import styles from './carousel.module.css';
import tokens from './carousel.tokens.generated.module.css';

export type CarouselLayout = 'multi-browse' | 'hero' | 'center-hero' | 'uncontained';

/**
 * How the viewport is shared between the items in view, first slot to last, as relative widths.
 * Items grow and shrink as they pass from slot to slot.
 */
const LAYOUT_WEIGHTS = {
  'multi-browse': [6, 3, 1],
  hero: [9, 1],
  'center-hero': [1, 8, 1],
} as const;

export interface CarouselProps
  extends Omit<ComponentPropsWithRef<'section'>, 'role' | 'children' | 'aria-label'> {
  /** The `CarouselItem`s. */
  children: ReactNode;
  /**
   * `multi-browse`: a large item, a medium and a small, for browsing many. `hero`: one large
   * item and a sliver of the next. `center-hero`: a large item in the middle, a sliver each
   * side. `uncontained`: items of one size, scrolled freely. @default 'multi-browse'
   */
  layout?: CarouselLayout;
  /**
   * Replaces the layout's own: relative widths of the items in view, first slot to last. The
   * largest is where the item in focus sits. Ignored by `uncontained`.
   */
  weights?: readonly number[];
  /** Height in pixels. @default 200 */
  height?: number;
  /** For `uncontained`, the width of each item in pixels. @default 186 */
  itemWidth?: number;
  /** The space between items in pixels. @default 8 */
  gap?: number;
  /** Names the carousel. */
  'aria-label': string;
}

/** What an item knows of its place, for its default label. */
const ItemContext = createContext<{ index: number; count: number }>({ index: 0, count: 1 });

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A carousel: a row of items, usually images, that scrolls and snaps one item at a time. With
 * a weighted layout the items grow and shrink as they pass through the slots of the viewport,
 * as Material's multi-browse and hero carousels do. It is a native scroll container, so touch,
 * trackpad and keyboard scrolling just work; the arrow keys also move between items.
 *
 * ```tsx
 * <Carousel aria-label="Recipes" layout="multi-browse">
 *   <CarouselItem aria-label="Apple pie" href="/pie"><img src={pie} alt="" /></CarouselItem>
 *   <CarouselItem aria-label="Lemon tart" href="/tart"><img src={tart} alt="" /></CarouselItem>
 * </Carousel>
 * ```
 */
export function Carousel({
  children,
  layout = 'multi-browse',
  weights: weightsProp,
  height = 200,
  itemWidth = 186,
  gap = 8,
  className,
  style,
  ref,
  onKeyDown,
  onFocus,
  ...rest
}: CarouselProps) {
  const uncontained = layout === 'uncontained';
  const weights = weightsProp ?? LAYOUT_WEIGHTS[uncontained ? 'multi-browse' : layout];
  const sum = weights.reduce((total, w) => total + w, 0);
  const focal = weights.indexOf(Math.max(...weights));
  const items = Children.toArray(children);
  const count = items.length;

  const viewport = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef<HTMLElement>(undefined, ref);

  /** Sets each item's width and place from how far the viewport has scrolled. */
  const place = useCallback(() => {
    const scroller = viewport.current;
    const row = list.current;
    if (!scroller || !row || uncontained) return;
    const width = scroller.clientWidth;
    const slots = weights.map((w) => (w / sum) * width);
    const edges = [0];
    for (const slot of slots) edges.push((edges.at(-1) as number) + slot);
    const direction = getComputedStyle(scroller).direction === 'rtl' ? -1 : 1;
    const unit = slots[focal] as number;
    const step = unit > 0 ? Math.abs(scroller.scrollLeft) / unit : 0;
    /** Where slot position `p` starts: slots are laid end to end, and extend past both ends. */
    const edge = (p: number) => {
      if (p <= 0) return p * (slots[0] as number);
      if (p >= slots.length) return width;
      const k = Math.floor(p);
      return (edges[k] as number) + (p - k) * (slots[k] as number);
    };
    for (let i = 0; i < row.children.length; i++) {
      const el = row.children[i] as HTMLElement;
      const p = i - step + focal;
      const start = edge(p);
      el.style.inlineSize = `${Math.max(0, edge(p + 1) - start - gap)}px`;
      el.style.transform = `translateX(${direction * start}px)`;
    }
  }, [weights, sum, focal, gap, uncontained]);

  // Lay out before the first paint, and again when anything that shapes the layout changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `count` and `height` change what `place` lays out, not what it reads.
  useLayoutEffect(place, [place, count, height]);
  useEffect(() => {
    const scroller = viewport.current;
    if (!scroller || uncontained) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    scroller.addEventListener('scroll', schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', schedule);
      observer.disconnect();
    };
  }, [place, uncontained]);

  /** Scrolls so that item `index` is where the focus goes: the focal slot, or in view. */
  const reveal = useCallback(
    (index: number, always: boolean) => {
      const scroller = viewport.current;
      const row = list.current;
      if (!scroller || !row) return;
      const behavior = reducedMotion() ? 'auto' : 'smooth';
      if (uncontained) {
        (row.children[index] as HTMLElement | undefined)?.scrollIntoView({
          inline: 'nearest',
          block: 'nearest',
          behavior,
        });
        return;
      }
      const unit = ((weights[focal] as number) / sum) * scroller.clientWidth;
      const step = unit > 0 ? Math.abs(scroller.scrollLeft) / unit : 0;
      const p = index - step + focal;
      const inView = p >= -0.001 && p <= weights.length - 1 + 0.001;
      if (always || !inView) {
        const direction = getComputedStyle(scroller).direction === 'rtl' ? -1 : 1;
        scroller.scrollTo({ left: direction * index * unit, behavior });
      }
    },
    [weights, sum, focal, uncontained],
  );

  const indexOf = (node: Element | null) => {
    const item = node?.closest('[data-carousel-item]');
    return item && item.parentElement === list.current
      ? Array.prototype.indexOf.call(list.current?.children, item)
      : -1;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const here = indexOf(document.activeElement);
    const target = event.target as HTMLElement;
    if (here < 0 || target.matches('input, textarea, select, [contenteditable]')) return;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    let next: number;
    if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) next = Math.min(here + 1, count - 1);
    else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) next = Math.max(here - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else return;
    event.preventDefault();
    reveal(next, true);
    (list.current?.children[next] as HTMLElement | undefined)
      ?.querySelector<HTMLElement>('a[href], button:not(:disabled), [tabindex]')
      ?.focus({ preventScroll: true });
  };

  // Tabbing to an item that is out of view brings it in.
  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    onFocus?.(event);
    const index = indexOf(event.target);
    if (index >= 0) reveal(index, false);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the arrow keys and focus move between the items inside, whose events bubble up to here.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: as above.
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: a <section> with an accessible name is a region, which supports a role description.
    <section
      {...rest}
      ref={mergedRef}
      aria-roledescription="carousel"
      className={cx(styles.root, tokens.root, className)}
      style={
        {
          ...style,
          '--_height': `${height}px`,
          '--_gap': `${gap}px`,
          '--_item-width': `${itemWidth}px`,
          '--_focal': weights[focal],
          '--_sum': sum,
          '--_count': count,
        } as CSSProperties
      }
      data-layout={layout}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      {/* Firefox puts a scroll container in the tab order, even when it holds focusable items, as one
          more stop before the first; -1 leaves only the items. */}
      <div ref={viewport} className={styles.viewport} tabIndex={-1}>
        <div className={styles.stage} aria-hidden="true">
          {items.map((_, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: markers are one per step, and have no identity of their own.
              key={index}
              className={styles.snap}
              style={{ '--_index': index } as CSSProperties}
            />
          ))}
        </div>
        <div ref={list} className={styles.items}>
          {items.map((item, index) => (
            <ItemContext.Provider
              key={(item as ReactElement).key ?? `item-${index}`}
              value={{ index, count }}
            >
              {item}
            </ItemContext.Provider>
          ))}
        </div>
      </div>
    </section>
  );
}

interface CarouselItemOwnProps {
  /** The content, usually an image that covers the item. */
  children: ReactNode;
  /** Makes the whole item a link. */
  href?: string;
  /** Makes the whole item a button. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
  /** Names the item. Default: its place, such as "2 of 8". */
  'aria-label'?: string;
}

export type CarouselItemProps = CarouselItemOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof CarouselItemOwnProps | 'role'>;

/** One item of a `Carousel`. Pass `href` or `onClick` to make it pressable. */
export function CarouselItem({
  children,
  href,
  onClick,
  disabled = false,
  render,
  className,
  'aria-label': ariaLabel,
  ...rest
}: CarouselItemProps) {
  const { index, count } = useContext(ItemContext);
  const pressable = href !== undefined || onClick !== undefined;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a slide is `role="group"` with a "slide" role description in the WAI-ARIA carousel pattern; a <fieldset> is a form control group.
    <div
      {...rest}
      role="group"
      aria-roledescription="slide"
      aria-label={ariaLabel ?? `${index + 1} of ${count}`}
      className={cx(styles.item, className)}
      data-carousel-item=""
      data-disabled={disabled ? '' : undefined}
    >
      {pressable
        ? renderElement(
            href !== undefined ? 'a' : 'button',
            {
              className: styles.press,
              ...(href !== undefined
                ? {
                    href: disabled ? undefined : href,
                    role: disabled ? 'link' : undefined,
                    'aria-disabled': disabled || undefined,
                    tabIndex: disabled ? -1 : undefined,
                    onClick: disabled ? (event: MouseEvent) => event.preventDefault() : onClick,
                  }
                : { type: 'button', disabled, onClick }),
              children,
            },
            render,
          )
        : children}
    </div>
  );
}
