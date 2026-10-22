import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.js';
import { Tooltip } from './tooltip.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const trigger = () => page.getByRole('button', { name: 'Favourite' }).element() as HTMLElement;
// A hidden tooltip is not rendered, so look it up by attribute.
const tip = () => document.querySelector('[popover]') as HTMLElement;
const shown = () => tip().matches(':popover-open');
const centre = (el: Element) => rect(el).left + rect(el).width / 2;

/** Room around the trigger, so the tooltip is not pushed to another side. */
const Spot = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '120px 160px' }}>{children}</div>
);

const Rich = (props: Partial<React.ComponentProps<typeof Tooltip>>) => (
  <Spot>
    <Tooltip
      variant="rich"
      subhead="Favourites"
      content="Saved items appear on your home screen."
      delay={10}
      {...props}
    >
      <Button>Favourite</Button>
    </Tooltip>
  </Spot>
);

test('leaves the layout while hidden, so nothing invisible takes presses or is read', async () => {
  await render(
    <Spot>
      <Tooltip content="Add to favourites" delay={30}>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  expect(style(tip()).display).toBe('none');
  await userEvent.hover(trigger());
  await expect.poll(shown).toBe(true);
  expect(style(tip()).display).not.toBe('none');
});

test('shows after the pointer rests on the trigger, and hides when it leaves', async () => {
  await render(
    <Spot>
      <Tooltip content="Add to favourites" delay={30}>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  expect(shown()).toBe(false);
  await userEvent.hover(trigger());
  await expect.poll(shown).toBe(true);
  expect(tip().textContent).toBe('Add to favourites');
  await userEvent.unhover(trigger());
  await expect.poll(shown).toBe(false);
});

test('waits for the delay before showing', async () => {
  await render(
    <Spot>
      <Tooltip content="Add" delay={400}>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  await userEvent.hover(trigger());
  expect(shown()).toBe(false);
  await expect.poll(shown, { timeout: 2000 }).toBe(true);
});

test('shows at once for keyboard focus, and goes on Escape', async () => {
  await render(
    <Spot>
      <button type="button">Before</button>
      <Tooltip content="Add" delay={5000}>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  // Tab from a known place, not from wherever the last test left the browser's focus.
  page.getByRole('button', { name: 'Before' }).element().focus();
  await userEvent.tab();
  await expect.poll(shown).toBe(true);
  await userEvent.keyboard('{Escape}');
  await expect.poll(shown).toBe(false);
});

test('does not show for focus from a mouse click, and a press hides it', async () => {
  await render(
    <Spot>
      <Tooltip content="Add" delay={10}>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  await userEvent.hover(trigger());
  await expect.poll(shown).toBe(true);
  await userEvent.click(trigger());
  await expect.poll(shown).toBe(false);
});

test('describes the trigger', async () => {
  await render(
    <Spot>
      <Tooltip content="Add to favourites">
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  expect(tip()).toHaveAttribute('role', 'tooltip');
  await expect
    .element(page.getByRole('button', { name: 'Favourite' }))
    .toHaveAccessibleDescription('Add to favourites');
});

test('keeps the trigger’s own handlers', async () => {
  const onClick = vi.fn();
  await render(
    <Spot>
      <Tooltip content="Add">
        <Button onClick={onClick}>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  await userEvent.click(trigger());
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('can be controlled', async () => {
  const { rerender } = await render(
    <Spot>
      <Tooltip content="Add" open>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  await expect.poll(shown).toBe(true);
  await rerender(
    <Spot>
      <Tooltip content="Add" open={false}>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  await expect.poll(shown).toBe(false);
});

test('animates out before it is hidden, in every browser', async () => {
  const { rerender } = await render(
    <Spot>
      <Tooltip content="Add" open>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  await expect.poll(() => style(tip()).opacity).toBe('1');
  await rerender(
    <Spot>
      <Tooltip content="Add" open={false}>
        <Button>Favourite</Button>
      </Tooltip>
    </Spot>,
  );
  expect(shown()).toBe(true);
  expect(tip()).toHaveAttribute('data-closing');
  await expect.poll(shown).toBe(false);
});

test.describe('plain', () => {
  test('is a dark 24px-tall label with 4px corners and small text', async () => {
    await render(
      <Spot>
        <Tooltip content="Add" open>
          <Button>Favourite</Button>
        </Tooltip>
      </Spot>,
    );
    await expect.poll(() => style(tip()).opacity).toBe('1');
    // inverse-surface and inverse-on-surface.
    expect(style(tip()).backgroundColor).toBe('rgb(50, 47, 53)');
    expect(style(tip()).color).toBe('rgb(245, 239, 247)');
    expect(px(style(tip()).borderTopLeftRadius)).toBe(4);
    expect(style(tip()).fontSize).toBe('12px');
    expect(rect(tip()).height).toBeGreaterThanOrEqual(24);
    expect(px(style(tip()).paddingLeft)).toBe(8);
  });

  test('sits above the trigger, centred, 4px away', async () => {
    await render(
      <Spot>
        <Tooltip content="Add" open>
          <Button>Favourite</Button>
        </Tooltip>
      </Spot>,
    );
    await expect.poll(() => Math.round(rect(trigger()).top - rect(tip()).bottom)).toBe(4);
    expect(Math.abs(centre(tip()) - centre(trigger()))).toBeLessThan(1);
  });

  test('can sit below, or to either side', async () => {
    const { rerender } = await render(
      <Spot>
        <Tooltip content="Add" open placement="bottom">
          <Button>Favourite</Button>
        </Tooltip>
      </Spot>,
    );
    await expect.poll(() => Math.round(rect(tip()).top - rect(trigger()).bottom)).toBe(4);
    await rerender(
      <Spot>
        <Tooltip content="Add" open placement="end">
          <Button>Favourite</Button>
        </Tooltip>
      </Spot>,
    );
    await expect.poll(() => Math.round(rect(tip()).left - rect(trigger()).right)).toBe(4);
    await rerender(
      <Spot>
        <Tooltip content="Add" open placement="start">
          <Button>Favourite</Button>
        </Tooltip>
      </Spot>,
    );
    await expect.poll(() => Math.round(rect(trigger()).left - rect(tip()).right)).toBe(4);
  });

  test('flips to the other side when there is no room', async () => {
    // The trigger is at the very top of the page, so "above" has no room.
    await render(
      <Tooltip content="Add" open>
        <Button>Favourite</Button>
      </Tooltip>,
    );
    await expect.poll(() => rect(tip()).top).toBeGreaterThanOrEqual(rect(trigger()).bottom);
  });
});

test.describe('rich', () => {
  test('is a surface with a subhead, text and rounded corners', async () => {
    await render(<Rich open />);
    await expect.poll(() => style(tip()).opacity).toBe('1');
    // surface-container.
    expect(style(tip()).backgroundColor).toBe('rgb(243, 237, 247)');
    expect(px(style(tip()).borderTopLeftRadius)).toBe(12);
    expect(style(tip()).boxShadow).not.toBe('none');
    expect(tip().querySelector('h2')?.textContent).toBe('Favourites');
    expect(style(tip().querySelector('h2') as Element).fontSize).toBe('14px');
    expect(rect(tip()).width).toBeLessThanOrEqual(312);
  });

  test('sits below the trigger by default', async () => {
    await render(<Rich open />);
    await expect.poll(() => Math.round(rect(tip()).top - rect(trigger()).bottom)).toBe(4);
  });

  test('with actions it is a labelled dialog the trigger does not describe', async () => {
    await render(<Rich open actions={<Button variant="text">Learn more</Button>} />);
    expect(tip()).toHaveAttribute('role', 'dialog');
    expect(tip().getAttribute('aria-labelledby')).toBe(tip().querySelector('h2')?.id);
    expect(trigger()).not.toHaveAttribute('aria-describedby');
    await expect.element(page.getByRole('button', { name: 'Learn more' })).toBeVisible();
  });

  test('stays open while the pointer crosses onto it, and closes once it leaves', async () => {
    await render(<Rich actions={<Button variant="text">Learn more</Button>} />);
    await userEvent.hover(trigger());
    await expect.poll(shown).toBe(true);
    await userEvent.hover(page.getByRole('button', { name: 'Learn more' }));
    // Well past the grace period, it is still open because the pointer is on it.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(shown()).toBe(true);
    await userEvent.unhover(page.getByRole('button', { name: 'Learn more' }));
    await userEvent.hover(document.body, { force: true, position: { x: 2, y: innerHeight - 2 } });
    await expect.poll(shown).toBe(false);
  });
});
