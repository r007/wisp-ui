import type { ReactNode } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Carousel, CarouselItem, type CarouselProps } from './carousel.js';

const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const carousel = () => page.getByRole('region', { name: 'Recipes' }).element() as HTMLElement;
const viewport = () => carousel().firstElementChild as HTMLElement;
const items = () => Array.from(carousel().querySelectorAll<HTMLElement>('[data-carousel-item]'));
const widths = () => items().map((item) => Math.round(rect(item).width));
/** Where an item starts, measured from the carousel's start edge. */
const startOf = (index: number) =>
  Math.round(rect(items()[index] as HTMLElement).left - rect(carousel()).left);
const focusedItem = () => document.activeElement?.closest('[data-carousel-item]');
const names = ['Pie', 'Bread', 'Cake', 'Soup', 'Tart', 'Risotto'];

/** 600px wide, so every size below can be computed: a slot's share of 600, less the 8px gap. */
const Wide = ({ children }: { children: ReactNode }) => (
  <div style={{ inlineSize: 600 }}>{children}</div>
);

function Sample({ children, ...props }: Partial<CarouselProps> & { children?: ReactNode }) {
  return (
    <Wide>
      <Carousel aria-label="Recipes" height={120} {...props}>
        {children ??
          names.map((name) => (
            <CarouselItem key={name} aria-label={name} href={`#${name}`}>
              <span>{name}</span>
            </CarouselItem>
          ))}
      </Carousel>
    </Wide>
  );
}

test('is a named carousel region whose items are slides', async () => {
  await render(<Sample />);
  await expect.element(page.getByRole('region', { name: 'Recipes' })).toBeVisible();
  expect(carousel()).toHaveAttribute('aria-roledescription', 'carousel');
  const slide = page.getByRole('group', { name: 'Pie' }).element();
  expect(slide).toHaveAttribute('aria-roledescription', 'slide');
  expect(items()).toHaveLength(6);
});

test('labels a slide by its place when it has no name of its own', async () => {
  await render(
    <Sample>
      <CarouselItem>
        <span>One</span>
      </CarouselItem>
      <CarouselItem>
        <span>Two</span>
      </CarouselItem>
    </Sample>,
  );
  await expect.element(page.getByRole('group', { name: '1 of 2' })).toBeVisible();
  await expect.element(page.getByRole('group', { name: '2 of 2' })).toBeVisible();
});

test.describe('layouts', () => {
  test('multi-browse shares the width 6 : 3 : 1, a large, a medium and a small item', async () => {
    await render(<Sample layout="multi-browse" />);
    // 60%, 30% and 10% of 600, less the 8px gap; the rest wait out of view.
    expect(widths()).toEqual([352, 172, 52, 0, 0, 0]);
    expect([startOf(0), startOf(1), startOf(2)]).toEqual([0, 360, 540]);
  });

  test('hero is one large item and a sliver of the next', async () => {
    await render(<Sample layout="hero" />);
    expect(widths()).toEqual([532, 52, 0, 0, 0, 0]);
  });

  test('center-hero starts with the large item where the middle slot is', async () => {
    await render(<Sample layout="center-hero" />);
    // Slots of 60, 480 and 60: nothing before the first item yet, so it takes the middle slot.
    expect(widths()).toEqual([472, 52, 0, 0, 0, 0]);
    expect(startOf(0)).toBe(60);
  });

  test('takes its slots from `weights`', async () => {
    await render(<Sample weights={[1, 1]} />);
    expect(widths()).toEqual([292, 292, 0, 0, 0, 0]);
  });

  test('keeps `gap` between items', async () => {
    await render(<Sample layout="hero" gap={20} />);
    expect(widths()).toEqual([520, 40, 0, 0, 0, 0]);
  });

  test('is `height` tall, and an item fills it', async () => {
    await render(<Sample height={150} />);
    expect(rect(carousel()).height).toBe(150);
    expect(rect(items()[0] as HTMLElement).height).toBe(150);
  });

  test('uncontained keeps every item one size and scrolls the row', async () => {
    await render(<Sample layout="uncontained" itemWidth={186} gap={8} />);
    expect(widths()).toEqual([186, 186, 186, 186, 186, 186]);
    expect(startOf(1)).toBe(194);
    expect(viewport().scrollWidth).toBeGreaterThan(viewport().clientWidth);
  });

  test('shows nothing odd for an empty carousel', async () => {
    await render(<Sample>{[]}</Sample>);
    expect(items()).toHaveLength(0);
  });
});

test.describe('scrolling', () => {
  /** Without the snap, a scroll can stop between two items, so the in-between sizes can be read. */
  const freeScroll = (left: number) => {
    viewport().style.scrollSnapType = 'none';
    viewport().style.scrollBehavior = 'auto';
    viewport().scrollLeft = left;
  };

  test('is a native scroll container that snaps one item at a time', async () => {
    await render(<Sample />);
    expect(style(viewport()).overflowX).toBe('auto');
    expect(style(viewport()).scrollSnapType).toContain('mandatory');
  });

  test('scrolls one step for each item: the width of the focal slot', async () => {
    await render(<Sample layout="multi-browse" />);
    // 6 items: five steps of 360px (the large slot) beyond the first screen.
    expect(viewport().scrollWidth - viewport().clientWidth).toBe(5 * 360);
  });

  test('the items grow and shrink as they pass through the slots', async () => {
    await render(<Sample layout="multi-browse" />);
    freeScroll(180);
    // Half a step: the second item is halfway from medium (172) to large (352), and the third
    // halfway from small (52) to medium (172). The first has moved half out of the view.
    await expect.poll(() => widths().slice(0, 4)).toEqual([352, 262, 112, 22]);
    expect(startOf(0)).toBe(-180);
    freeScroll(360);
    await expect.poll(() => widths().slice(0, 4)).toEqual([352, 352, 172, 52]);
    expect(startOf(1)).toBe(0);
  });

  test('settles on a whole item', async () => {
    await render(<Sample layout="multi-browse" />);
    viewport().style.scrollBehavior = 'auto';
    viewport().scrollLeft = 100;
    await expect.poll(() => viewport().scrollLeft).toBe(0);
    viewport().scrollLeft = 250;
    await expect.poll(() => viewport().scrollLeft).toBe(360);
  });

  test('uncontained scrolls a row of equal items, and settles on one', async () => {
    await render(<Sample layout="uncontained" itemWidth={186} gap={8} />);
    viewport().style.scrollBehavior = 'auto';
    viewport().scrollLeft = 150;
    await expect.poll(() => viewport().scrollLeft).toBe(194);
  });
});

test.describe('items', () => {
  test('are rounded 28px and clip what is inside', async () => {
    await render(<Sample />);
    const item = items()[0] as HTMLElement;
    expect(style(item).borderTopLeftRadius).toBe('28px');
    expect(style(item).overflow).toBe('hidden');
  });

  test('are plain until they have an `href` or an `onClick`', async () => {
    await render(
      <Sample>
        <CarouselItem aria-label="Static">
          <span>Static</span>
        </CarouselItem>
      </Sample>,
    );
    expect(page.getByRole('link').elements()).toHaveLength(0);
    expect(page.getByRole('button').elements()).toHaveLength(0);
  });

  test('become a link with an `href`', async () => {
    await render(<Sample />);
    const link = page.getByRole('link', { name: 'Pie' });
    await expect.element(link).toHaveAttribute('href', '#Pie');
  });

  test('become a button with an `onClick`, which is called', async () => {
    const onClick = vi.fn();
    await render(
      <Sample>
        <CarouselItem aria-label="Pie" onClick={onClick}>
          <span>Pie</span>
        </CarouselItem>
      </Sample>,
    );
    await userEvent.click(page.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('cannot be pressed when disabled, and look it', async () => {
    const onClick = vi.fn();
    await render(
      <Sample>
        <CarouselItem aria-label="Pie" onClick={onClick} disabled>
          <span>Pie</span>
        </CarouselItem>
      </Sample>,
    );
    expect(page.getByRole('button').element()).toBeDisabled();
    expect(style(items()[0] as HTMLElement).opacity).toBe('0.38');
  });

  test('a disabled link has no destination', async () => {
    await render(
      <Sample>
        <CarouselItem aria-label="Pie" href="#pie" disabled>
          <span>Pie</span>
        </CarouselItem>
      </Sample>,
    );
    const link = page.getByRole('link', { name: 'Pie' }).element();
    expect(link).not.toHaveAttribute('href');
    expect(link).toHaveAttribute('aria-disabled', 'true');
  });

  test('lets a consumer swap the element, e.g. for a router link', async () => {
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    await render(
      <Sample>
        <CarouselItem
          aria-label="Pie"
          href="/pie"
          render={<a className="router" href="/pie" onClick={onClick} />}
        >
          <span>Pie</span>
        </CarouselItem>
      </Sample>,
    );
    const link = page.getByRole('link', { name: 'Pie' }).element();
    expect(link).toHaveClass('router');
    await userEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('tint on hover, over the content', async () => {
    await render(<Sample />);
    const link = page.getByRole('link', { name: 'Pie' });
    expect(style(link.element(), '::after').opacity).toBe('0');
    await userEvent.hover(link);
    await expect.poll(() => style(link.element(), '::after').opacity).toBe('0.08');
  });

  test('draw a focus ring inside the item when focused with the keyboard', async () => {
    await render(<Sample />);
    await userEvent.tab();
    const link = page.getByRole('link', { name: 'Pie' }).element();
    expect(link).toHaveFocus();
    expect(style(link).outlineStyle).toBe('solid');
    expect(Number.parseFloat(style(link).outlineWidth)).toBe(3);
    expect(Number.parseFloat(style(link).outlineOffset)).toBe(-3);
  });
});

test.describe('keyboard', () => {
  const settled = () => viewport().scrollLeft;

  test('moves focus from item to item with the arrow keys, scrolling it into place', async () => {
    await render(<Sample layout="multi-browse" />);
    await userEvent.tab();
    expect(focusedItem()).toBe(items()[0]);
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedItem()).toBe(items()[1]);
    await expect.poll(settled).toBe(360);
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedItem()).toBe(items()[2]);
    await expect.poll(settled).toBe(720);
    await userEvent.keyboard('{ArrowLeft}');
    expect(focusedItem()).toBe(items()[1]);
    await expect.poll(settled).toBe(360);
  });

  test('stops at the first and last items', async () => {
    await render(<Sample layout="multi-browse" />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');
    expect(focusedItem()).toBe(items()[0]);
    await userEvent.keyboard('{End}');
    expect(focusedItem()).toBe(items()[5]);
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedItem()).toBe(items()[5]);
  });

  test('Home and End go to the first and the last item', async () => {
    await render(<Sample layout="multi-browse" />);
    await userEvent.tab();
    await userEvent.keyboard('{End}');
    expect(focusedItem()).toBe(items()[5]);
    await expect.poll(settled).toBe(5 * 360);
    await userEvent.keyboard('{Home}');
    expect(focusedItem()).toBe(items()[0]);
    await expect.poll(settled).toBe(0);
  });

  test('reverses the arrows in a right-to-left layout', async () => {
    await render(
      <div dir="rtl">
        <Sample />
      </div>,
    );
    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');
    expect(focusedItem()).toBe(items()[1]);
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedItem()).toBe(items()[0]);
  });

  test('brings an item into view when focus reaches it out of view', async () => {
    await render(<Sample layout="multi-browse" />);
    (page.getByRole('link', { name: 'Tart' }).element() as HTMLElement).focus();
    await expect.poll(settled).toBeGreaterThan(0);
  });

  test('does not take the arrow keys from a text field inside an item', async () => {
    await render(
      <Sample>
        <CarouselItem aria-label="Search">
          <input aria-label="Filter" defaultValue="abc" />
        </CarouselItem>
        <CarouselItem aria-label="Other">
          <span>Other</span>
        </CarouselItem>
      </Sample>,
    );
    const input = page.getByRole('textbox', { name: 'Filter' }).element() as HTMLInputElement;
    input.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(input);
  });

  test('moves between uncontained items too', async () => {
    await render(<Sample layout="uncontained" itemWidth={186} gap={8} />);
    await userEvent.tab();
    await userEvent.keyboard('{End}');
    expect(focusedItem()).toBe(items()[5]);
    await expect.poll(settled).toBeGreaterThan(0);
  });
});

test('forwards a ref, a class and props to the region', async () => {
  let node: HTMLElement | null = null;
  await render(
    <Sample
      className="mine"
      data-testid="carousel"
      ref={(el) => {
        node = el;
      }}
    />,
  );
  expect(node).toBe(carousel());
  expect(carousel()).toHaveClass('mine');
  expect(carousel().getAttribute('data-testid')).toBe('carousel');
});

test('lays out again when the width it is given changes', async () => {
  const { rerender } = await render(<Sample layout="hero" />);
  expect(widths()[0]).toBe(532);
  await rerender(
    <div style={{ inlineSize: 300 }}>
      <Carousel aria-label="Recipes" height={120} layout="hero">
        {names.map((name) => (
          <CarouselItem key={name} aria-label={name} href={`#${name}`}>
            <span>{name}</span>
          </CarouselItem>
        ))}
      </Carousel>
    </div>,
  );
  await expect.poll(() => widths()[0]).toBe(262);
});
