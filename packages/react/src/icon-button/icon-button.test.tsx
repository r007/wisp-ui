import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { IconButton } from './icon-button.js';

const px = (value: string) => Number.parseFloat(value);
const Icon = ({ id = 'icon' }: { id?: string }) => <svg data-testid={id} />;

test('is named by its aria-label and hides the icon from assistive technology', async () => {
  await render(
    <IconButton aria-label="Settings">
      <Icon />
    </IconButton>,
  );
  await expect.element(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  expect(page.getByTestId('icon').element().parentElement?.getAttribute('aria-hidden')).toBe(
    'true',
  );
});

test.each([
  ['xsmall', 32],
  ['small', 40],
  ['medium', 56],
  ['large', 96],
  ['xlarge', 136],
] as const)('%s is a %ipx circle by default', async (size, dimension) => {
  await render(
    <IconButton aria-label="x" size={size}>
      <Icon />
    </IconButton>,
  );
  const rect = page.getByRole('button').element().getBoundingClientRect();
  expect(rect.height).toBe(dimension);
  expect(rect.width).toBe(dimension);
});

test.each([
  ['narrow', 32],
  ['default', 40],
  ['wide', 52],
] as const)('the %s width of a small button is %ipx', async (width, expected) => {
  await render(
    <IconButton aria-label="x" width={width}>
      <Icon />
    </IconButton>,
  );
  expect(page.getByRole('button').element().getBoundingClientRect().width).toBe(expected);
});

test('has no container unless it is filled, tonal or toggled on', async () => {
  const { rerender } = await render(
    <IconButton aria-label="x" variant="standard">
      <Icon />
    </IconButton>,
  );
  const element = () => page.getByRole('button').element();
  expect(getComputedStyle(element()).backgroundColor).toBe('rgba(0, 0, 0, 0)');

  await rerender(
    <IconButton aria-label="x" variant="filled">
      <Icon />
    </IconButton>,
  );
  // The container colour transitions on a spring, so wait for it to settle.
  await expect.poll(() => getComputedStyle(element()).backgroundColor).toBe('rgb(103, 80, 164)');
});

test('toggles, swapping to the selected icon', async () => {
  const onSelectedChange = vi.fn();
  await render(
    <IconButton
      aria-label="Favourite"
      defaultSelected={false}
      onSelectedChange={onSelectedChange}
      selectedIcon={<Icon id="on" />}
    >
      <Icon id="off" />
    </IconButton>,
  );
  const button = page.getByRole('button', { name: 'Favourite' });
  await expect.element(button).toHaveAttribute('aria-pressed', 'false');
  expect(page.getByTestId('off').elements()).toHaveLength(1);

  await userEvent.click(button);
  await expect.element(button).toHaveAttribute('aria-pressed', 'true');
  expect(page.getByTestId('on').elements()).toHaveLength(1);
  expect(page.getByTestId('off').elements()).toHaveLength(0);
  expect(onSelectedChange).toHaveBeenCalledWith(true);
});

test('morphs from a circle to rounded corners when selected', async () => {
  await render(
    <IconButton aria-label="x" variant="tonal" defaultSelected={false}>
      <Icon />
    </IconButton>,
  );
  const button = page.getByRole('button');
  const element = button.element();
  expect(px(getComputedStyle(element).borderTopLeftRadius)).toBe(20);
  await userEvent.click(button);
  await expect.poll(() => px(getComputedStyle(element).borderTopLeftRadius)).toBe(12);
});

test('does not fire when disabled', async () => {
  const onClick = vi.fn();
  await render(
    <IconButton aria-label="x" disabled onClick={onClick}>
      <Icon />
    </IconButton>,
  );
  const button = page.getByRole('button');
  await expect.element(button).toBeDisabled();
  await userEvent.click(button, { force: true });
  expect(onClick).not.toHaveBeenCalled();
});

test('renders a link, and a disabled link keeps its role', async () => {
  const { rerender } = await render(
    <IconButton aria-label="Docs" href="/docs">
      <Icon />
    </IconButton>,
  );
  await expect.element(page.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');

  await rerender(
    <IconButton aria-label="Docs" href="/docs" disabled>
      <Icon />
    </IconButton>,
  );
  const link = page.getByRole('link', { name: 'Docs' });
  await expect.element(link).not.toHaveAttribute('href');
  await expect.element(link).toHaveAttribute('aria-disabled', 'true');
});

test('extends the hit area to a 48px touch target on both axes', async () => {
  await render(
    <IconButton aria-label="x" size="xsmall" width="narrow">
      <Icon />
    </IconButton>,
  );
  const after = getComputedStyle(page.getByRole('button').element(), '::after');
  expect(px(after.height)).toBe(48);
  expect(px(after.width)).toBe(48);
});
