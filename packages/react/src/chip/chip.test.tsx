import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Chip } from './chip.js';
import { ChipGroup } from './chip-group.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const chip = (name: string) => page.getByRole('button', { name }).element() as HTMLElement;
/** The wrapper that draws the chip: the main button's parent. */
const root = (name: string) => chip(name).parentElement as HTMLElement;
const slot = (el: Element, name: string) =>
  el.querySelector(`[data-slot="${name}"]`) as HTMLElement;
const icon = <svg data-testid="icon" />;

test.describe('assist', () => {
  test('is a button named by its label, and clicks and presses like one', async () => {
    const onClick = vi.fn();
    await render(<Chip onClick={onClick}>Add to calendar</Chip>);
    const button = page.getByRole('button', { name: 'Add to calendar' });
    await expect.element(button).toBeVisible();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    (button.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
    expect(button.element()).not.toHaveAttribute('aria-pressed');
  });

  test('is a link with href, and takes a custom element with render', async () => {
    const own = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    await render(
      <>
        <Chip href="/maps">Directions</Chip>
        <Chip render={<a href="/x" className="router-link" onClick={own} />}>Router</Chip>
      </>,
    );
    expect(page.getByRole('link', { name: 'Directions' }).element()).toHaveAttribute(
      'href',
      '/maps',
    );
    const router = page.getByRole('link', { name: 'Router' });
    expect(router.element()).toHaveClass('router-link');
    await userEvent.click(router);
    expect(own).toHaveBeenCalled();
  });

  test('is 32px tall, with 12px corners and a 1px outline-variant outline', async () => {
    await render(<Chip>Label</Chip>);
    const el = root('Label');
    expect(rect(el).height).toBe(32);
    expect(px(style(el).borderTopLeftRadius)).toBe(12);
    // The outline is drawn inside the box, so it does not change the size.
    expect(style(el).boxShadow).toContain('inset');
    expect(style(el).boxShadow).toContain('rgb(202, 196, 208)');
    expect(style(el).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  test('pads 16px each side without icons and 8px before an icon', async () => {
    await render(
      <>
        <Chip>Plain</Chip>
        <Chip icon={icon}>Iconic</Chip>
      </>,
    );
    expect(rect(slot(chip('Plain'), 'label')).left - rect(root('Plain')).left).toBe(16);
    expect(rect(slot(root('Iconic'), 'icon')).left - rect(root('Iconic')).left).toBe(8);
    expect(rect(slot(root('Iconic'), 'icon')).width).toBe(18);
  });

  test('colours its icon primary and its label on-surface', async () => {
    await render(<Chip icon={icon}>Iconic</Chip>);
    expect(style(slot(root('Iconic'), 'leading')).color).toBe('rgb(103, 80, 164)');
    expect(style(root('Iconic')).color).toBe('rgb(29, 27, 32)');
  });

  test('shows a trailing icon and an avatar', async () => {
    await render(
      <Chip
        avatar={
          <img
            alt=""
            src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
          />
        }
        trailingIcon={icon}
      >
        Anna
      </Chip>,
    );
    const el = root('Anna');
    expect(rect(slot(el, 'icon')).width).toBe(24);
    // A circle: the radius is at least half the 24px avatar.
    expect(px(style(slot(el, 'leading')).borderTopLeftRadius)).toBeGreaterThanOrEqual(12);
    expect(rect(slot(el, 'trailing')).width).toBe(18);
    // 4px before an avatar.
    expect(rect(slot(el, 'icon')).left - rect(el).left).toBe(4);
  });

  test('is elevated with a shadow and a tinted container', async () => {
    await render(<Chip elevated>Label</Chip>);
    const el = style(root('Label'));
    expect(el.backgroundColor).toBe('rgb(247, 242, 250)');
    expect(el.boxShadow).not.toBe('none');
    expect(el.boxShadow).not.toContain('inset');
  });

  test('lifts when an elevated chip is hovered', async () => {
    await render(<Chip elevated>Label</Chip>);
    const rest = style(root('Label')).boxShadow;
    await userEvent.hover(chip('Label'));
    await expect.poll(() => style(root('Label')).boxShadow).not.toBe(rest);
  });

  test('is inert and faded when disabled', async () => {
    const onClick = vi.fn();
    await render(
      <Chip disabled onClick={onClick}>
        Label
      </Chip>,
    );
    await expect.element(page.getByRole('button')).toBeDisabled();
    await userEvent.click(page.getByRole('button'), { force: true });
    expect(onClick).not.toHaveBeenCalled();
    expect(style(root('Label')).color).toMatch(/0\.38|38%/);
  });

  test('a disabled link loses its href and is not focusable', async () => {
    await render(
      <Chip href="/x" disabled>
        Gone
      </Chip>,
    );
    const link = page.getByRole('link');
    expect(link.element()).not.toHaveAttribute('href');
    expect(link.element()).toHaveAttribute('aria-disabled', 'true');
    expect((link.element() as HTMLElement).tabIndex).toBe(-1);
  });

  test('draws the focus ring around the whole chip for keyboard focus', async () => {
    await render(<Chip>Label</Chip>);
    await userEvent.tab();
    await expect.element(page.getByRole('button')).toHaveFocus();
    expect(style(root('Label')).outlineStyle).toBe('solid');
    expect(px(style(root('Label')).outlineWidth)).toBe(3);
    // One ring, not the browser's default on the inner button as well.
    expect(style(chip('Label')).outlineStyle).toBe('none');
  });

  test('shows the press ripple', async () => {
    await render(<Chip>Label</Chip>);
    const surface = root('Label').querySelector('[data-wisp-state-layer]') as HTMLElement;
    chip('Label').dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        buttons: 1,
        bubbles: true,
      }),
    );
    expect(surface).toHaveAttribute('data-pressed');
  });
});

test.describe('filter', () => {
  test('is a toggle that reports its state', async () => {
    const onSelectedChange = vi.fn();
    await render(
      <Chip variant="filter" onSelectedChange={onSelectedChange}>
        Jazz
      </Chip>,
    );
    const button = page.getByRole('button', { name: 'Jazz' });
    await expect.element(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    await expect.element(button).toHaveAttribute('aria-pressed', 'true');
    expect(onSelectedChange).toHaveBeenLastCalledWith(true);
  });

  test('stays put when controlled until the parent updates it', async () => {
    const onSelectedChange = vi.fn();
    const { rerender } = await render(
      <Chip variant="filter" selected={false} onSelectedChange={onSelectedChange}>
        Jazz
      </Chip>,
    );
    await userEvent.click(chip('Jazz'));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(chip('Jazz')).toHaveAttribute('aria-pressed', 'false');
    await rerender(
      <Chip variant="filter" selected onSelectedChange={onSelectedChange}>
        Jazz
      </Chip>,
    );
    expect(chip('Jazz')).toHaveAttribute('aria-pressed', 'true');
  });

  test('fills with secondary-container, drops the outline and rounds fully when selected', async () => {
    await render(<Chip variant="filter">Jazz</Chip>);
    const el = root('Jazz');
    expect(px(style(el).borderTopLeftRadius)).toBe(12);
    await userEvent.click(chip('Jazz'));
    await expect.poll(() => style(el).backgroundColor).toBe('rgb(232, 222, 248)');
    // on-secondary-container.
    await expect.poll(() => style(el).color).toBe('rgb(74, 68, 88)');
    // Fully rounded: half the 32px height.
    await expect.poll(() => px(style(el).borderTopLeftRadius)).toBe(16);
    // A selected filter chip lifts on hover (the pointer is still over it)...
    await expect.poll(() => style(el).boxShadow).toContain('0px 1px 2px 0px');
    // ...and at rest has no outline.
    await userEvent.unhover(chip('Jazz'));
    await expect.poll(() => style(el).boxShadow).toContain('0px 0px 0px 0px');
  });

  test('folds a check into the leading slot when selected', async () => {
    await render(<Chip variant="filter">Jazz</Chip>);
    const leading = slot(root('Jazz'), 'leading');
    expect(rect(leading).width).toBe(0);
    expect(rect(slot(root('Jazz'), 'label')).left - rect(root('Jazz')).left).toBe(16);

    await userEvent.click(chip('Jazz'));
    await expect.poll(() => rect(leading).width).toBe(18);
    // 8px before the check, then the gap, then the label.
    await expect.poll(() => rect(leading).left - rect(root('Jazz')).left).toBe(8);
    expect(px(style(slot(root('Jazz'), 'tick')).opacity)).toBeGreaterThan(0);
  });

  test('replaces an icon with the check when selected', async () => {
    await render(
      <Chip variant="filter" icon={icon}>
        Jazz
      </Chip>,
    );
    const el = root('Jazz');
    expect(px(style(slot(el, 'icon')).opacity)).toBe(1);
    await userEvent.click(chip('Jazz'));
    await expect.poll(() => px(style(slot(el, 'icon')).opacity)).toBe(0);
    await expect.poll(() => px(style(slot(el, 'tick')).opacity)).toBe(1);
  });

  test('can be elevated', async () => {
    await render(
      <Chip variant="filter" elevated>
        Jazz
      </Chip>,
    );
    expect(style(root('Jazz')).backgroundColor).toBe('rgb(247, 242, 250)');
    await userEvent.click(chip('Jazz'));
    await expect.poll(() => style(root('Jazz')).backgroundColor).toBe('rgb(232, 222, 248)');
  });

  test('a group names its chips', async () => {
    await render(
      <ChipGroup aria-label="Genre">
        <Chip variant="filter">Jazz</Chip>
        <Chip variant="filter">Blues</Chip>
      </ChipGroup>,
    );
    const group = page.getByRole('group', { name: 'Genre' });
    await expect.element(group).toBeVisible();
    expect(style(group.element()).gap).toBe('8px');
    expect(rect(root('Blues')).left - rect(root('Jazz')).right).toBe(8);
  });
});

test.describe('input', () => {
  test('has a remove button named after the label', async () => {
    const onRemove = vi.fn();
    await render(
      <Chip variant="input" onRemove={onRemove}>
        Jazz
      </Chip>,
    );
    await userEvent.click(page.getByRole('button', { name: 'Remove Jazz' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('takes an explicit remove label', async () => {
    await render(
      <Chip variant="input" onRemove={() => {}} removeLabel="Delete tag">
        <b>Jazz</b>
      </Chip>,
    );
    await expect.element(page.getByRole('button', { name: 'Delete tag' })).toBeVisible();
  });

  test('is removed with Backspace or Delete on the focused chip', async () => {
    const onRemove = vi.fn();
    await render(
      <Chip variant="input" onRemove={onRemove}>
        Jazz
      </Chip>,
    );
    chip('Jazz').focus();
    await userEvent.keyboard('{Backspace}');
    await userEvent.keyboard('{Delete}');
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  test('keeps its remove button next to, not inside, the main button', async () => {
    await render(
      <Chip variant="input" onRemove={() => {}}>
        Jazz
      </Chip>,
    );
    const remove = page.getByRole('button', { name: 'Remove Jazz' }).element();
    expect(chip('Jazz').contains(remove)).toBe(false);
    expect(root('Jazz').contains(remove)).toBe(true);
    // The remove button sits at the end, 8px from the edge to its icon.
    expect(rect(root('Jazz')).right - rect(remove).right).toBe(5);
    expect(rect(slot(root('Jazz'), 'label')).left - rect(root('Jazz')).left).toBe(12);
  });

  test('is a toggle only when given a selected state', async () => {
    await render(
      <>
        <Chip variant="input">Plain</Chip>
        <Chip variant="input" defaultSelected>
          Picked
        </Chip>
      </>,
    );
    expect(chip('Plain')).not.toHaveAttribute('aria-pressed');
    expect(chip('Picked')).toHaveAttribute('aria-pressed', 'true');
  });

  test('disables both buttons', async () => {
    await render(
      <Chip variant="input" disabled onRemove={() => {}}>
        Jazz
      </Chip>,
    );
    await expect.element(page.getByRole('button', { name: 'Jazz' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Remove Jazz' })).toBeDisabled();
  });

  test('is never elevated', async () => {
    await render(
      <Chip variant="input" elevated>
        Jazz
      </Chip>,
    );
    expect(root('Jazz')).not.toHaveAttribute('data-elevated');
  });
});

test.describe('suggestion', () => {
  test('is a plain action chip with an on-surface-variant label', async () => {
    await render(<Chip variant="suggestion">Try this</Chip>);
    expect(style(root('Try this')).color).toBe('rgb(73, 69, 79)');
    expect(chip('Try this')).not.toHaveAttribute('aria-pressed');
  });
});
