import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { TextField } from './text-field.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const input = () => page.getByRole('textbox').element() as HTMLInputElement | HTMLTextAreaElement;
const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`) as HTMLElement;

test('is a native input named by its label', async () => {
  await render(<TextField label="Email" type="email" />);
  const field = page.getByRole('textbox', { name: 'Email' });
  await expect.element(field).toBeVisible();
  expect(field.element().tagName).toBe('INPUT');
  expect((field.element() as HTMLInputElement).type).toBe('email');
});

test('takes its name from aria-label when it has no visible label', async () => {
  await render(<TextField aria-label="Search" />);
  await expect.element(page.getByRole('textbox', { name: 'Search' })).toBeVisible();
});

test('is labelled by a real <label>, though the label itself ignores the pointer', async () => {
  await render(<TextField label="Email" />);
  // Activating the label is the platform's job; the component only has to associate them.
  expect((slot('label') as HTMLLabelElement).control).toBe(input());
  // A pointer press where the label rests lands on the input beneath, which focuses it.
  const label = rect(slot('label'));
  expect(document.elementFromPoint(label.left + 10, label.top + 10)).toBe(input());
});

test('is focused by pressing its padding or leading icon', async () => {
  await render(<TextField label="Email" leadingIcon={<svg data-testid="icon" />} />);
  await userEvent.click(page.getByTestId('icon'));
  await expect.element(page.getByRole('textbox')).toHaveFocus();
});

function UppercaseField({ onValueChange }: { onValueChange: (value: string) => void }) {
  const [value, setValue] = useState('a');
  return (
    <TextField
      label="Name"
      value={value}
      onValueChange={(next) => {
        onValueChange(next);
        setValue(next.toUpperCase());
      }}
    />
  );
}

test('types, reports the value, and is controllable', async () => {
  const onValueChange = vi.fn();
  await render(<UppercaseField onValueChange={onValueChange} />);
  await userEvent.click(page.getByRole('textbox'));
  await userEvent.keyboard('bc');
  // 'a' became 'A', then 'b' and 'c' were typed after it.
  expect(onValueChange).toHaveBeenLastCalledWith('ABc');
  expect(input().value).toBe('ABC');
});

test('takes part in a form like any input', async () => {
  await render(
    <form data-testid="form">
      <TextField label="Name" name="name" defaultValue="Ada" />
    </form>,
  );
  const data = new FormData(page.getByTestId('form').element() as HTMLFormElement);
  expect(data.get('name')).toBe('Ada');
});

test('does not accept input when disabled', async () => {
  await render(<TextField label="Name" disabled />);
  await expect.element(page.getByRole('textbox')).toBeDisabled();
});

test.describe('label', () => {
  test('rests inside the field and floats up when focused', async () => {
    await render(<TextField label="Email" />);
    const label = slot('label');
    expect(style(label).scale).toBe('1');
    await userEvent.click(page.getByRole('textbox'));
    await expect.poll(() => px(style(label).scale)).toBe(0.75);
    await expect.poll(() => px(style(label).translate.split(' ')[1] ?? '0')).toBe(-8);
  });

  test('stays floated above a field with a value, and drops back when emptied', async () => {
    await render(<TextField label="Email" defaultValue="ada@example.com" />);
    const label = slot('label');
    expect(px(style(label).scale)).toBe(0.75);
    await userEvent.click(page.getByRole('textbox'));
    await userEvent.clear(page.getByRole('textbox'));
    (document.activeElement as HTMLElement).blur();
    await expect.poll(() => style(label).scale).toBe('1');
  });

  test('floats for input types that always show something', async () => {
    await render(<TextField label="Birthday" type="date" />);
    expect(px(style(slot('label')).scale)).toBe(0.75);
  });

  test('marks a required field with an asterisk that is not read out', async () => {
    await render(<TextField label="Email" required />);
    expect(slot('label').textContent).toBe('Email *');
    await expect.element(page.getByRole('textbox', { name: 'Email' })).toBeRequired();
  });

  test('hides the placeholder until the label has floated', async () => {
    await render(<TextField label="Email" placeholder="you@example.com" />);
    expect(style(input(), '::placeholder').color).toMatch(
      /rgba\(0, 0, 0, 0\)|transparent|color\(srgb 0 0 0 \/ 0\)/,
    );
    await userEvent.click(page.getByRole('textbox'));
    await expect.poll(() => style(input(), '::placeholder').color).not.toMatch(/, 0\)$|\/ 0\)$/);
  });
});

test.describe('filled', () => {
  test('is a 56px tinted container with rounded top corners', async () => {
    await render(<TextField label="Email" />);
    const field = slot('field');
    expect(rect(field).height).toBe(56);
    expect(style(field).backgroundColor).toBe('rgb(230, 224, 233)');
    expect(px(style(field).borderTopLeftRadius)).toBe(4);
    expect(px(style(field).borderBottomLeftRadius)).toBe(0);
  });

  test('draws a 1px active indicator that thickens to 3px primary on focus', async () => {
    await render(<TextField label="Email" />);
    const line = slot('indicator');
    expect(rect(line).height).toBe(1);
    // on-surface-variant.
    expect(style(line).backgroundColor).toBe('rgb(73, 69, 79)');
    await userEvent.click(page.getByRole('textbox'));
    await expect.poll(() => rect(line).height).toBe(3);
    await expect.poll(() => style(line).backgroundColor).toBe('rgb(103, 80, 164)');
  });

  test('colours its focused label primary', async () => {
    await render(<TextField label="Email" />);
    await userEvent.click(page.getByRole('textbox'));
    await expect.poll(() => style(slot('label')).color).toBe('rgb(103, 80, 164)');
  });

  test('darkens its indicator on hover', async () => {
    await render(<TextField label="Email" />);
    await userEvent.hover(slot('field'));
    // on-surface.
    await expect.poll(() => style(slot('indicator')).backgroundColor).toBe('rgb(29, 27, 32)');
  });
});

test.describe('outlined', () => {
  test('draws a 1px outline in the outline colour, thickening to 3px primary on focus', async () => {
    await render(<TextField variant="outlined" label="Email" />);
    const start = slot('outline-start');
    expect(px(style(start).borderTopWidth)).toBe(1);
    expect(style(start).borderTopColor).toBe('rgb(121, 116, 126)');
    await userEvent.click(page.getByRole('textbox'));
    await expect.poll(() => px(style(start).borderTopWidth)).toBe(3);
    await expect.poll(() => style(start).borderTopColor).toBe('rgb(103, 80, 164)');
    expect(style(slot('field')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  test('floats the label onto the outline and cuts a notch for it', async () => {
    await render(<TextField variant="outlined" label="Email" />);
    const notch = slot('notch');
    expect(style(notch).borderTopColor).toBe('rgb(121, 116, 126)');
    const resting = rect(slot('label')).top;
    await userEvent.click(page.getByRole('textbox'));
    // The label's centre now sits on the top edge of the field.
    await expect
      .poll(() => {
        const label = rect(slot('label'));
        return Math.abs(label.top + label.height / 2 - rect(slot('field')).top);
      })
      .toBeLessThan(1);
    expect(rect(slot('label')).top).toBeLessThan(resting);
    await expect.poll(() => style(notch).borderTopColor).toBe('rgba(0, 0, 0, 0)');
  });

  test('sizes the notch to the floated label', async () => {
    await render(<TextField variant="outlined" label="A fairly long label" defaultValue="x" />);
    // The width of the label's text as drawn, at 75%.
    const range = document.createRange();
    range.selectNodeContents(slot('label'));
    const text = range.getBoundingClientRect().width;
    // The notch adds 4px each side.
    expect(Math.abs(rect(slot('notch')).width - (text + 8))).toBeLessThan(3);
  });

  test('has no notch without a label', async () => {
    await render(<TextField variant="outlined" aria-label="Search" />);
    expect(rect(slot('notch')).width).toBe(0);
  });
});

test.describe('supporting text', () => {
  test('describes the input', async () => {
    await render(<TextField label="Email" supportingText="We never share it" />);
    await expect
      .element(page.getByRole('textbox', { name: 'Email' }))
      .toHaveAccessibleDescription('We never share it');
    // body-small, on-surface-variant.
    expect(style(slot('support')).fontSize).toBe('12px');
    expect(style(slot('support').parentElement as Element).color).toBe('rgb(73, 69, 79)');
  });

  test('is replaced by the error text, and the field turns red', async () => {
    await render(
      <TextField label="Email" supportingText="We never share it" errorText="Not an email" error />,
    );
    await expect.element(page.getByRole('textbox')).toHaveAccessibleDescription('Not an email');
    await expect.element(page.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    await expect.poll(() => style(slot('indicator')).backgroundColor).toBe('rgb(179, 38, 30)');
    expect(style(slot('support').parentElement as Element).color).toBe('rgb(179, 38, 30)');
    await expect.poll(() => style(slot('label')).color).toBe('rgb(179, 38, 30)');
  });

  test('keeps the supporting text when invalid without an error text', async () => {
    await render(<TextField label="Email" supportingText="We never share it" error />);
    await expect
      .element(page.getByRole('textbox'))
      .toHaveAccessibleDescription('We never share it');
  });

  test('counts characters against maxLength', async () => {
    await render(<TextField label="Bio" maxLength={20} counter defaultValue="hello" />);
    await expect.element(page.getByText('5/20')).toBeVisible();
    await userEvent.click(page.getByRole('textbox'));
    await userEvent.keyboard('!!');
    await expect.element(page.getByText('7/20')).toBeVisible();
  });
});

test.describe('slots', () => {
  test('shows 24px leading and trailing icons, and a trailing control', async () => {
    const onClick = vi.fn();
    await render(
      <TextField
        label="Search"
        leadingIcon={<svg data-testid="lead" />}
        trailingIcon={
          <button type="button" aria-label="Clear" onClick={onClick}>
            x
          </button>
        }
      />,
    );
    expect(rect(page.getByTestId('lead').element()).width).toBe(24);
    await userEvent.click(page.getByRole('button', { name: 'Clear' }));
    expect(onClick).toHaveBeenCalled();
  });

  test('indents the text past a leading icon', async () => {
    const { rerender } = await render(<TextField label="A" />);
    const bare = rect(input()).left - rect(slot('field')).left;
    await rerender(<TextField label="A" leadingIcon={<svg />} />);
    expect(rect(input()).left - rect(slot('field')).left).toBeGreaterThan(bare + 24);
  });

  test('shows a prefix and suffix once the label has floated', async () => {
    await render(<TextField label="Amount" prefixText="$" suffixText="USD" />);
    const prefix = page.getByText('$').element();
    expect(px(style(prefix).opacity)).toBe(0);
    await userEvent.click(page.getByRole('textbox'));
    await expect.poll(() => px(style(prefix).opacity)).toBe(1);
    expect(rect(prefix).right).toBeLessThanOrEqual(rect(input()).left);
    expect(rect(page.getByText('USD').element()).left).toBeGreaterThanOrEqual(
      rect(input()).right - 1,
    );
  });

  test('shows the prefix at once when there is no label', async () => {
    await render(<TextField aria-label="Amount" prefixText="$" />);
    expect(px(style(page.getByText('$').element()).opacity)).toBe(1);
  });
});

test.describe('multiline', () => {
  test('is a textarea with the given number of rows', async () => {
    await render(<TextField label="Bio" multiline rows={4} />);
    expect(input().tagName).toBe('TEXTAREA');
    expect((input() as HTMLTextAreaElement).rows).toBe(4);
  });

  test('is at least `rows` lines tall', async () => {
    await render(<TextField label="Bio" multiline rows={4} />);
    // body-large has a 24px line height.
    expect(rect(input()).height).toBeGreaterThanOrEqual(4 * 24 - 1);
  });

  test('keeps its icons at the top', async () => {
    await render(
      <TextField label="Bio" multiline rows={4} leadingIcon={<svg data-testid="i" />} />,
    );
    expect(rect(page.getByTestId('i').element()).top - rect(slot('field')).top).toBe(16);
  });
});

test.describe('disabled', () => {
  test('fades the field and ignores the pointer', async () => {
    await render(<TextField label="Name" defaultValue="Ada" disabled />);
    const field = slot('field');
    expect(style(field).pointerEvents).toBe('none');
    expect(style(slot('indicator')).backgroundColor).toMatch(/0\.38|38%/);
    expect(style(input()).color).toMatch(/0\.38|38%/);
    expect(style(field).backgroundColor).toMatch(/0\.04|4%/);
  });
});
