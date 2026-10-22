import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Radio } from './radio.js';
import { RadioGroup } from './radio-group.js';

const px = (value: string) => Number.parseFloat(value);
const ring = (root: Element) => root.querySelector('[data-slot="ring"]') as HTMLElement;
const dot = (root: Element) => root.querySelector('[data-slot="dot"]') as HTMLElement;
const radio = (name: string) => page.getByRole('radio', { name }).element() as HTMLInputElement;

function Sizes({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <RadioGroup aria-label="Size" defaultValue="m" onValueChange={onValueChange}>
      <label>
        <Radio value="s" /> Small
      </label>
      <label>
        <Radio value="m" /> Medium
      </label>
      <label>
        <Radio value="l" /> Large
      </label>
    </RadioGroup>
  );
}

function Controlled({ onValueChange }: { onValueChange: (value: string) => void }) {
  const [value, setValue] = useState('s');
  return (
    <RadioGroup
      aria-label="Size"
      value={value}
      onValueChange={(next) => {
        onValueChange(next);
        setValue(next);
      }}
    >
      <label>
        <Radio value="s" /> Small
      </label>
      <label>
        <Radio value="l" /> Large
      </label>
    </RadioGroup>
  );
}

test('is a native radio button', async () => {
  await render(<Radio aria-label="Small" />);
  const el = page.getByRole('radio', { name: 'Small' });
  await expect.element(el).toBeVisible();
  expect(el.element().tagName).toBe('INPUT');
  expect((el.element() as HTMLInputElement).type).toBe('radio');
  await expect.element(el).not.toBeChecked();
});

test('selects on click and stays selected, like any radio', async () => {
  const onChange = vi.fn();
  await render(<Radio aria-label="Small" onChange={onChange} />);
  await userEvent.click(page.getByRole('radio'));
  await expect.element(page.getByRole('radio')).toBeChecked();
  await userEvent.click(page.getByRole('radio'));
  await expect.element(page.getByRole('radio')).toBeChecked();
  expect(onChange).toHaveBeenCalledTimes(1);
});

test('radios sharing a name are one group and move with the arrow keys', async () => {
  await render(
    <>
      <Radio name="size" value="s" aria-label="Small" defaultChecked />
      <Radio name="size" value="l" aria-label="Large" />
    </>,
  );
  radio('Small').focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(page.getByRole('radio', { name: 'Large' })).toBeChecked();
  await expect.element(page.getByRole('radio', { name: 'Small' })).not.toBeChecked();
});

test('is named and selected by a wrapping label', async () => {
  await render(
    <label>
      <Radio /> Express
    </label>,
  );
  await userEvent.click(page.getByText('Express'));
  await expect.element(page.getByRole('radio', { name: 'Express' })).toBeChecked();
});

test('does not select when disabled', async () => {
  const onChange = vi.fn();
  await render(<Radio aria-label="x" disabled onChange={onChange} />);
  await expect.element(page.getByRole('radio')).toBeDisabled();
  await userEvent.click(page.getByRole('radio'), { force: true });
  expect(onChange).not.toHaveBeenCalled();
});

test('has Material proportions and a 48px touch target', async () => {
  const { container } = await render(<Radio aria-label="x" />);
  const root = container.firstElementChild as HTMLElement;
  expect(root.getBoundingClientRect().width).toBe(40);
  expect(root.getBoundingClientRect().height).toBe(40);
  expect(ring(root).getBoundingClientRect().width).toBe(20);
  expect(page.getByRole('radio').element().getBoundingClientRect().width).toBe(48);
  expect(page.getByRole('radio').element().getBoundingClientRect().height).toBe(48);
});

test('paints a grey ring that turns primary with a 10px dot when selected', async () => {
  const { container } = await render(<Radio aria-label="x" />);
  const root = container.firstElementChild as HTMLElement;
  // on-surface-variant, 2px.
  expect(getComputedStyle(ring(root)).borderTopColor).toBe('rgb(73, 69, 79)');
  expect(px(getComputedStyle(ring(root)).borderTopWidth)).toBe(2);
  expect(dot(root).getBoundingClientRect().width).toBe(0);

  await userEvent.click(page.getByRole('radio'));
  await expect.poll(() => getComputedStyle(ring(root)).borderTopColor).toBe('rgb(103, 80, 164)');
  await expect.poll(() => dot(root).getBoundingClientRect().width).toBe(10);
  expect(getComputedStyle(dot(root)).backgroundColor).toBe('rgb(103, 80, 164)');
});

test('draws the focus ring around the radio for keyboard focus', async () => {
  const { container } = await render(<Radio aria-label="x" />);
  await userEvent.tab();
  await expect.element(page.getByRole('radio')).toHaveFocus();
  const style = getComputedStyle(ring(container.firstElementChild as HTMLElement));
  expect(style.outlineStyle).toBe('solid');
  expect(px(style.outlineWidth)).toBe(3);
});

test('shows the press ripple', async () => {
  const { container } = await render(<Radio aria-label="x" />);
  const surface = container.querySelector('[data-wisp-state-layer]') as HTMLElement;
  page
    .getByRole('radio')
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
  expect(surface).toHaveAttribute('data-pressed');
});

test.describe('RadioGroup', () => {
  test('is a named radiogroup that selects its default value', async () => {
    await render(<Sizes />);
    await expect.element(page.getByRole('radiogroup', { name: 'Size' })).toBeVisible();
    await expect.element(page.getByRole('radio', { name: 'Medium' })).toBeChecked();
    await expect.element(page.getByRole('radio', { name: 'Small' })).not.toBeChecked();
  });

  test('selects one radio at a time and reports the value', async () => {
    const onValueChange = vi.fn();
    await render(<Sizes onValueChange={onValueChange} />);
    await userEvent.click(page.getByText('Large'));
    await expect.element(page.getByRole('radio', { name: 'Large' })).toBeChecked();
    await expect.element(page.getByRole('radio', { name: 'Medium' })).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith('l');
  });

  test('gives every radio the same name, so arrow keys move between them', async () => {
    await render(<Sizes />);
    const names = new Set(['Small', 'Medium', 'Large'].map((label) => radio(label).name));
    expect(names.size).toBe(1);
    expect([...names][0]).not.toBe('');

    radio('Medium').focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('radio', { name: 'Large' })).toBeChecked();
  });

  test('is controlled by value', async () => {
    const onValueChange = vi.fn();
    await render(<Controlled onValueChange={onValueChange} />);
    await expect.element(page.getByRole('radio', { name: 'Small' })).toBeChecked();
    await userEvent.click(page.getByText('Large'));
    expect(onValueChange).toHaveBeenCalledWith('l');
    await expect.element(page.getByRole('radio', { name: 'Large' })).toBeChecked();
  });

  test('stays put when `value` is fixed', async () => {
    const onValueChange = vi.fn();
    await render(
      <RadioGroup aria-label="Size" value="s" onValueChange={onValueChange}>
        <Radio value="s" aria-label="Small" />
        <Radio value="l" aria-label="Large" />
      </RadioGroup>,
    );
    await userEvent.click(page.getByRole('radio', { name: 'Large' }));
    expect(onValueChange).toHaveBeenCalledWith('l');
    await expect.element(page.getByRole('radio', { name: 'Small' })).toBeChecked();
  });

  test('can disable every radio in it', async () => {
    await render(
      <RadioGroup aria-label="Size" disabled defaultValue="s">
        <Radio value="s" aria-label="Small" />
        <Radio value="l" aria-label="Large" />
      </RadioGroup>,
    );
    await expect.element(page.getByRole('radio', { name: 'Small' })).toBeDisabled();
    await expect.element(page.getByRole('radio', { name: 'Large' })).toBeDisabled();
  });

  test('submits the selected value with the form', async () => {
    await render(
      <form data-testid="form">
        <RadioGroup aria-label="Size" name="size" defaultValue="l">
          <Radio value="s" aria-label="Small" />
          <Radio value="l" aria-label="Large" />
        </RadioGroup>
      </form>,
    );
    const data = new FormData(page.getByTestId('form').element() as HTMLFormElement);
    expect(data.get('size')).toBe('l');
  });
});
