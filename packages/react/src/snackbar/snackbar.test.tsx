import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button/button.js';
import { Snackbar } from './snackbar.js';
import { SnackbarProvider, useSnackbar } from './snackbar-provider.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
// A closed snackbar is not rendered, so look it up by attribute.
const bar = () => document.querySelector('[popover]') as HTMLElement;
const shown = () => Boolean(bar()?.matches(':popover-open'));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function QueueButtons() {
  const { show, dismiss } = useSnackbar();
  return (
    <>
      <Button onClick={() => show({ message: 'First', duration: null })}>One</Button>
      <Button onClick={() => show({ message: 'Second', duration: null })}>Two</Button>
      <Button onClick={dismiss}>Dismiss all</Button>
    </>
  );
}

function Lonely() {
  useSnackbar();
  return null;
}

test('shows its message in a status region while open', async () => {
  const { rerender } = await render(<Snackbar open={false}>Saved</Snackbar>);
  expect(shown()).toBe(false);
  await rerender(<Snackbar open>Saved</Snackbar>);
  await expect.poll(shown).toBe(true);
  await expect.element(page.getByRole('status')).toHaveTextContent('Saved');
});

test('leaves the layout while closed, so nothing invisible takes presses or is read', async () => {
  const { rerender } = await render(<Snackbar open={false}>Saved</Snackbar>);
  expect(style(bar()).display).toBe('none');
  await rerender(<Snackbar open>Saved</Snackbar>);
  await expect.poll(shown).toBe(true);
  expect(style(bar()).display).not.toBe('none');
});

test('is a dark container with 4px corners and a 48px minimum height', async () => {
  await render(<Snackbar open>Saved</Snackbar>);
  await expect.poll(() => style(bar()).opacity).toBe('1');
  // inverse-surface and inverse-on-surface.
  expect(style(bar()).backgroundColor).toBe('rgb(50, 47, 53)');
  expect(style(bar()).color).toBe('rgb(245, 239, 247)');
  expect(px(style(bar()).borderTopLeftRadius)).toBe(4);
  expect(rect(bar()).height).toBeGreaterThanOrEqual(48);
  expect(style(bar()).boxShadow).not.toBe('none');
});

test('sits 16px from the bottom start corner on a wide screen', async () => {
  await page.viewport(900, 700);
  await render(<Snackbar open>Saved</Snackbar>);
  await expect.poll(() => style(bar()).opacity).toBe('1');
  expect(Math.round(rect(bar()).left)).toBe(16);
  expect(Math.round(window.innerHeight - rect(bar()).bottom)).toBe(16);
  expect(rect(bar()).width).toBeGreaterThanOrEqual(344);
  await page.viewport(414, 896);
});

test('spans the screen, 8px in, on a narrow one', async () => {
  await render(<Snackbar open>Saved</Snackbar>);
  await expect.poll(() => style(bar()).opacity).toBe('1');
  expect(Math.round(rect(bar()).left)).toBe(8);
  expect(Math.round(window.innerWidth - rect(bar()).right)).toBe(8);
});

test.describe('action', () => {
  test('is a 48px text button in the inverse primary colour', async () => {
    await render(
      <Snackbar open actionLabel="Undo">
        Archived
      </Snackbar>,
    );
    const action = page.getByRole('button', { name: 'Undo' }).element();
    await expect.poll(() => style(bar()).opacity).toBe('1');
    expect(rect(action).height).toBe(48);
    // inverse-primary, label-large.
    expect(style(action).color).toBe('rgb(208, 188, 255)');
    expect(style(action).fontSize).toBe('14px');
  });

  test('runs, then closes the snackbar', async () => {
    const onAction = vi.fn();
    const onOpenChange = vi.fn();
    await render(
      <Snackbar open actionLabel="Undo" onAction={onAction} onOpenChange={onOpenChange}>
        Archived
      </Snackbar>,
    );
    await expect.poll(() => style(bar()).opacity).toBe('1');
    await userEvent.click(page.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('shows the press ripple', async () => {
    await render(
      <Snackbar open actionLabel="Undo">
        Archived
      </Snackbar>,
    );
    page
      .getByRole('button', { name: 'Undo' })
      .element()
      .dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          buttons: 1,
          bubbles: true,
        }),
      );
    expect(bar().querySelector('[data-wisp-state-layer]')).toHaveAttribute('data-pressed');
  });
});

test('has a close button when dismissible', async () => {
  const onOpenChange = vi.fn();
  await render(
    <Snackbar open dismissible onOpenChange={onOpenChange}>
      Archived
    </Snackbar>,
  );
  await expect.poll(() => style(bar()).opacity).toBe('1');
  expect(rect(page.getByRole('button', { name: 'Dismiss' }).element()).width).toBe(48);
  await userEvent.click(page.getByRole('button', { name: 'Dismiss' }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test.describe('timing', () => {
  test('closes itself when the duration is up', async () => {
    const onOpenChange = vi.fn();
    await render(
      <Snackbar open duration={150} onOpenChange={onOpenChange}>
        Saved
      </Snackbar>,
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    await expect.poll(() => onOpenChange.mock.calls.length).toBe(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('stays until dismissed with a null duration', async () => {
    const onOpenChange = vi.fn();
    await render(
      <Snackbar open duration={null} onOpenChange={onOpenChange}>
        Saved
      </Snackbar>,
    );
    await wait(300);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('waits while the pointer is on it, then closes once it leaves', async () => {
    const onOpenChange = vi.fn();
    await render(
      <Snackbar open duration={900} onOpenChange={onOpenChange} actionLabel="Undo">
        Saved
      </Snackbar>,
    );
    // Hover at once, then wait out more than the whole duration.
    await userEvent.hover(bar());
    await wait(1300);
    expect(onOpenChange).not.toHaveBeenCalled();
    await userEvent.hover(document.documentElement, {
      force: true,
      position: { x: 2, y: 2 },
    });
    await expect.poll(() => onOpenChange.mock.calls.length, { timeout: 3000 }).toBe(1);
  });

  test('waits while focus is inside it', async () => {
    const onOpenChange = vi.fn();
    await render(
      <Snackbar open duration={200} onOpenChange={onOpenChange} actionLabel="Undo">
        Saved
      </Snackbar>,
    );
    page.getByRole('button', { name: 'Undo' }).element().focus();
    await wait(500);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

test('animates out before it is hidden, and says when it has gone', async () => {
  const onExited = vi.fn();
  const { rerender } = await render(
    <Snackbar open onExited={onExited}>
      Saved
    </Snackbar>,
  );
  await expect.poll(() => style(bar()).opacity).toBe('1');
  await rerender(
    <Snackbar open={false} onExited={onExited}>
      Saved
    </Snackbar>,
  );
  expect(shown()).toBe(true);
  expect(bar()).toHaveAttribute('data-closing');
  await expect.poll(shown).toBe(false);
  expect(onExited).toHaveBeenCalledTimes(1);
});

test.describe('SnackbarProvider', () => {
  test('shows one message at a time, the next after the first has gone', async () => {
    await render(
      <SnackbarProvider>
        <QueueButtons />
      </SnackbarProvider>,
    );
    await userEvent.click(page.getByRole('button', { name: 'One' }));
    await userEvent.click(page.getByRole('button', { name: 'Two' }));
    await expect.poll(() => bar()?.textContent).toBe('First');
    expect(document.querySelectorAll('[popover]')).toHaveLength(1);

    await userEvent.click(page.getByRole('button', { name: 'Dismiss all' }));
    await expect.poll(() => bar()?.textContent).toBe('Second');
    await expect.poll(shown).toBe(true);
  });

  test('requires a provider', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Lonely />)).rejects.toThrow('SnackbarProvider');
    errors.mockRestore();
  });
});
