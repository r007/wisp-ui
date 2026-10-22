import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from './button.js';

const px = (value: string) => Number.parseFloat(value);

test('renders a labelled button that never submits a form by accident', async () => {
  await render(<Button>Save</Button>);
  const button = page.getByRole('button', { name: 'Save' });
  await expect.element(button).toBeVisible();
  await expect.element(button).toHaveAttribute('type', 'button');
  await expect.element(button).not.toHaveAttribute('aria-pressed');
});

test('exposes its variant, size and shape for styling hooks', async () => {
  await render(
    <Button variant="tonal" size="large" shape="square">
      Go
    </Button>,
  );
  const button = page.getByRole('button', { name: 'Go' });
  await expect.element(button).toHaveAttribute('data-variant', 'tonal');
  await expect.element(button).toHaveAttribute('data-size', 'large');
  await expect.element(button).toHaveAttribute('data-shape', 'square');
});

test('hides icons from assistive technology; the label names the button', async () => {
  await render(
    <Button icon={<svg data-testid="icon" />} trailingIcon={<svg data-testid="trailing" />}>
      Next
    </Button>,
  );
  await expect.element(page.getByRole('button', { name: 'Next' })).toBeVisible();
  expect(page.getByTestId('icon').element().parentElement?.getAttribute('aria-hidden')).toBe(
    'true',
  );
});

test('calls onClick, and not when disabled', async () => {
  const onClick = vi.fn();
  const { rerender } = await render(<Button onClick={onClick}>Tap</Button>);
  await userEvent.click(page.getByRole('button', { name: 'Tap' }));
  expect(onClick).toHaveBeenCalledTimes(1);

  await rerender(
    <Button onClick={onClick} disabled>
      Tap
    </Button>,
  );
  const disabled = page.getByRole('button', { name: 'Tap' });
  await expect.element(disabled).toBeDisabled();
  await userEvent.click(disabled, { force: true });
  expect(onClick).toHaveBeenCalledTimes(1);
});

test.each([
  ['filled', 'rgb(103, 80, 164)'],
  ['tonal', 'rgb(232, 222, 248)'],
  ['elevated', 'rgb(247, 242, 250)'],
] as const)('%s paints the Material container colour', async (variant, color) => {
  await render(<Button variant={variant}>Colour</Button>);
  const style = getComputedStyle(page.getByRole('button').element());
  expect(style.backgroundColor).toBe(color);
});

test.each([
  ['xsmall', 32],
  ['small', 40],
  ['medium', 56],
  ['large', 96],
  ['xlarge', 136],
] as const)('%s is %ipx tall and fully rounded', async (size, height) => {
  await render(<Button size={size}>Size</Button>);
  const element = page.getByRole('button').element();
  expect(element.getBoundingClientRect().height).toBe(height);
  expect(px(getComputedStyle(element).borderTopLeftRadius)).toBe(height / 2);
});

test('uses the type scale of its size', async () => {
  await render(<Button>Label</Button>);
  const style = getComputedStyle(page.getByRole('button').element());
  expect(style.fontSize).toBe('14px');
  expect(style.fontWeight).toBe('500');
  expect(px(style.letterSpacing)).toBeCloseTo(0.1, 1);
});

test('extends the hit area of small buttons to a 48px touch target', async () => {
  await render(<Button size="small">Touch</Button>);
  const after = getComputedStyle(page.getByRole('button').element(), '::after');
  expect(px(after.top)).toBe(-4);
  expect(px(after.height)).toBe(48);
});

test.describe('toggle', () => {
  test('toggles uncontrolled and reports the change', async () => {
    const onSelectedChange = vi.fn();
    await render(
      <Button defaultSelected={false} onSelectedChange={onSelectedChange}>
        Fav
      </Button>,
    );
    const button = page.getByRole('button', { name: 'Fav' });
    await expect.element(button).toHaveAttribute('aria-pressed', 'false');
    await expect.element(button).not.toHaveAttribute('data-selected');

    await userEvent.click(button);
    await expect.element(button).toHaveAttribute('aria-pressed', 'true');
    await expect.element(button).toHaveAttribute('data-selected');
    expect(onSelectedChange).toHaveBeenLastCalledWith(true);
  });

  test('stays put when controlled until the parent updates it', async () => {
    const onSelectedChange = vi.fn();
    const { rerender } = await render(
      <Button selected={false} onSelectedChange={onSelectedChange}>
        Fav
      </Button>,
    );
    const button = page.getByRole('button', { name: 'Fav' });
    await userEvent.click(button);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    await expect.element(button).toHaveAttribute('aria-pressed', 'false');

    await rerender(
      <Button selected onSelectedChange={onSelectedChange}>
        Fav
      </Button>,
    );
    await expect.element(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('morphs from a pill to rounded corners when selected', async () => {
    await render(<Button defaultSelected={false}>Morph</Button>);
    const button = page.getByRole('button', { name: 'Morph' });
    const element = button.element();
    expect(px(getComputedStyle(element).borderTopLeftRadius)).toBe(20);

    await userEvent.click(button);
    // The corner animates on a spring, so wait for it to settle on the token (12px).
    await expect.poll(() => px(getComputedStyle(element).borderTopLeftRadius)).toBe(12);
  });
});

test.describe('as a link', () => {
  test('renders an anchor when given an href', async () => {
    await render(<Button href="/docs">Docs</Button>);
    const link = page.getByRole('link', { name: 'Docs' });
    await expect.element(link).toHaveAttribute('href', '/docs');
    expect(page.getByRole('button').elements()).toHaveLength(0);
  });

  test('a disabled link is removed from navigation and exposes its state', async () => {
    await render(
      <Button href="/docs" disabled>
        Docs
      </Button>,
    );
    const link = page.getByRole('link', { name: 'Docs' });
    await expect.element(link).not.toHaveAttribute('href');
    await expect.element(link).toHaveAttribute('role', 'link');
    await expect.element(link).toHaveAttribute('aria-disabled', 'true');
    await expect.element(link).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('render prop', () => {
  test('merges classes, handlers and refs into the element it is given', async () => {
    // Prevent navigation, which would unload the test page.
    const own = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    const ref = { current: null as HTMLElement | null };
    await render(
      <Button render={<a href="/x" className="router-link" onClick={own} />} ref={ref as never}>
        Router
      </Button>,
    );
    const link = page.getByRole('link', { name: 'Router' });
    await expect.element(link).toHaveClass('router-link');
    expect(link.element().className).toMatch(/wisp-button__root/);
    expect(ref.current).toBe(link.element());

    await userEvent.click(link);
    expect(own).toHaveBeenCalledTimes(1);
  });

  test('supports a render function for custom components', async () => {
    await render(
      <Button render={(props) => <a {...(props as object)} href="/fn" data-custom="yes" />}>
        Fn
      </Button>,
    );
    await expect
      .element(page.getByRole('link', { name: 'Fn' }))
      .toHaveAttribute('data-custom', 'yes');
  });
});

test.describe('press ripple', () => {
  const press = (element: Element, type: 'pointerdown' | 'pointerup') =>
    element.dispatchEvent(
      new PointerEvent(type, {
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        buttons: type === 'pointerdown' ? 1 : 0,
        bubbles: true,
      }),
    );

  test('marks the state layer pressed, and keeps it visible for a minimum time after a quick tap', async () => {
    await render(<Button>Ripple</Button>);
    const element = page.getByRole('button').element();
    const surface = element.querySelector('span[aria-hidden]') as HTMLElement;

    press(element, 'pointerdown');
    expect(surface).toHaveAttribute('data-pressed');
    press(element, 'pointerup');
    (element as HTMLElement).click();
    // A tap shorter than the minimum press time must still be seen.
    expect(surface).toHaveAttribute('data-pressed');
    await expect.poll(() => surface.hasAttribute('data-pressed')).toBe(false);
  });

  test('does nothing while disabled', async () => {
    await render(<Button disabled>Ripple</Button>);
    const element = page.getByRole('button').element();
    const surface = element.querySelector('span[aria-hidden]') as HTMLElement;
    press(element, 'pointerdown');
    expect(surface).not.toHaveAttribute('data-pressed');
  });

  test('cleans up when unmounted mid-press', async () => {
    const { unmount } = await render(<Button>Ripple</Button>);
    press(page.getByRole('button').element(), 'pointerdown');
    expect(() => unmount()).not.toThrow();
  });
});
