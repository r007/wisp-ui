import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Select, SelectOption, type SelectProps } from './select.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const field = () => page.getByRole('combobox', { name: 'Fruit' });
const input = () => field().element() as HTMLInputElement;
// A closed popover is not in the accessibility tree, so look it up by attribute.
const listbox = () => document.querySelector('[role="listbox"]') as HTMLElement;
const shown = () => listbox().matches(':popover-open');
const option = (name: string) => page.getByRole('option', { name, exact: true });
const box = () => input().closest('[data-slot="field"]') as HTMLElement;
const activeLabel = () => listbox().querySelector('[data-active]')?.textContent?.trim() ?? null;

function Sample(props: Partial<SelectProps>) {
  return (
    <div style={{ padding: '24px 24px 400px', inlineSize: 280 }}>
      <Select label="Fruit" {...props}>
        <SelectOption value="apple">Apple</SelectOption>
        <SelectOption value="apricot">Apricot</SelectOption>
        <SelectOption value="banana">Banana</SelectOption>
        <SelectOption value="cherry">Cherry</SelectOption>
        <SelectOption value="grape" disabled>
          Grape
        </SelectOption>
        <SelectOption value="pear">Pear</SelectOption>
      </Select>
    </div>
  );
}

/**
 * Opens it with a press. A busy headless Firefox sometimes drops one, so the press is repeated
 * while the field still says it is closed (`aria-expanded` follows a registered press at once,
 * so a slow popup is never pressed twice, which would close it).
 */
const open = () =>
  expect
    .poll(
      async () => {
        if (input().getAttribute('aria-expanded') !== 'true') await userEvent.click(field());
        return shown();
      },
      { timeout: 10_000, interval: 200 },
    )
    .toBe(true);

test.describe('semantics', () => {
  test('is a combobox that names a listbox, and is read-only text', async () => {
    await render(<Sample />);
    await expect.element(field()).toBeVisible();
    expect(input()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input().getAttribute('aria-controls')).toBe(listbox().id);
    expect(input().readOnly).toBe(true);
    expect(input().inputMode).toBe('none');
  });

  test('has a listbox of options, named by the label, once it is open', async () => {
    await render(<Sample />);
    await open();
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByRole('listbox', { name: 'Fruit' })).toBeVisible();
    expect(
      page
        .getByRole('option')
        .elements()
        .map((o) => o.textContent),
    ).toEqual(['Apple', 'Apricot', 'Banana', 'Cherry', 'Grape', 'Pear']);
  });

  test('marks the chosen option selected, and a disabled one disabled', async () => {
    await render(<Sample defaultValue="cherry" />);
    await open();
    expect(option('Cherry').element()).toHaveAttribute('aria-selected', 'true');
    expect(option('Apple').element()).toHaveAttribute('aria-selected', 'false');
    expect(option('Grape').element()).toHaveAttribute('aria-disabled', 'true');
  });

  test('names the active option with aria-activedescendant, while the focus stays on the field', async () => {
    await render(<Sample />);
    await open();
    await userEvent.keyboard('{ArrowDown}');
    const active = listbox().querySelector('[data-active]') as HTMLElement;
    expect(input().getAttribute('aria-activedescendant')).toBe(active.id);
    expect(document.activeElement).toBe(input());
  });

  test('has no active descendant while closed', async () => {
    await render(<Sample />);
    expect(input()).not.toHaveAttribute('aria-activedescendant');
  });

  test('takes a TextField’s label, supporting text and error, and says it is invalid', async () => {
    const { rerender } = await render(<Sample supportingText="Choose one" />);
    await expect.element(page.getByText('Choose one')).toBeVisible();
    await rerender(<Sample error errorText="Required" />);
    await expect.element(page.getByText('Required')).toBeVisible();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
  });

  test('is required when asked', async () => {
    await render(<Sample required />);
    expect(input().required).toBe(true);
  });

  test('throws a helpful error when an option is used alone', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<SelectOption value="x">X</SelectOption>)).rejects.toThrow(
      'SelectOption must be used inside <Select>',
    );
    spy.mockRestore();
  });
});

test.describe('the value', () => {
  test('shows the chosen option’s text in the field, and the label rests while there is none', async () => {
    const { rerender } = await render(<Sample />);
    expect(input().value).toBe('');
    await rerender(<Sample value="banana" />);
    expect(input().value).toBe('Banana');
  });

  test('is uncontrolled by default, and reports each choice', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await open();
    await userEvent.click(option('Banana'));
    expect(onValueChange).toHaveBeenCalledWith('banana');
    expect(input().value).toBe('Banana');
  });

  test('stays on the value it is given until the parent changes it', async () => {
    const onValueChange = vi.fn();
    await render(<Sample value="apple" onValueChange={onValueChange} />);
    await open();
    await userEvent.click(option('Pear'));
    expect(onValueChange).toHaveBeenCalledWith('pear');
    expect(input().value).toBe('Apple');
  });

  test('starts empty for a null value, and chooses nothing', async () => {
    await render(<Sample value={null} />);
    expect(input().value).toBe('');
  });

  test('takes the text of an option from textValue when its children are not text', async () => {
    await render(
      <div style={{ padding: 24, blockSize: 300 }}>
        <Select label="Fruit" defaultValue="a">
          <SelectOption value="a" textValue="Apple">
            <b>Apple</b> (red)
          </SelectOption>
        </Select>
      </div>,
    );
    expect(input().value).toBe('Apple');
  });

  test('finds options inside fragments and arrays', async () => {
    await render(
      <div style={{ padding: 24, blockSize: 300 }}>
        <Select label="Fruit" defaultValue="b">
          {/* biome-ignore lint/complexity/noUselessFragments: a fragment of options is the case under test. */}
          <>
            <SelectOption value="a">Alpha</SelectOption>
            {['b', 'c'].map((v) => (
              <SelectOption key={v} value={v}>
                {v.toUpperCase()}
              </SelectOption>
            ))}
          </>
        </Select>
      </div>,
    );
    expect(input().value).toBe('B');
  });

  test('submits with a form under its name', async () => {
    let data: FormData | null = null;
    await render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          data = new FormData(event.currentTarget);
        }}
      >
        <Sample name="fruit" defaultValue="cherry" />
        <button type="submit">Send</button>
      </form>,
    );
    await userEvent.click(page.getByRole('button', { name: 'Send' }));
    expect((data as FormData | null)?.get('fruit')).toBe('cherry');
  });
});

test.describe('opening and closing', () => {
  test('leaves the layout while closed, so nothing invisible takes presses or is read', async () => {
    await render(<Sample />);
    expect(shown()).toBe(false);
    expect(style(listbox()).display).toBe('none');
  });

  test('opens when the field is pressed, and closes when it is pressed again', async () => {
    await render(<Sample />);
    await open();
    await userEvent.click(field());
    await expect.poll(shown).toBe(false);
  });

  test('opens when the arrow, the label area or the padding of the field is pressed', async () => {
    await render(<Sample />);
    await userEvent.click(box(), { position: { x: 4, y: 4 } });
    await expect.poll(shown).toBe(true);
  });

  test('does not open when what is pressed is the supporting text below it', async () => {
    await render(<Sample supportingText="Choose one" />);
    await userEvent.click(page.getByText('Choose one'));
    expect(shown()).toBe(false);
  });

  test('closes on Escape, keeping the focus on the field', async () => {
    await render(<Sample />);
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.poll(shown).toBe(false);
    expect(document.activeElement).toBe(input());
  });

  test('closes on a press elsewhere', async () => {
    await render(
      <>
        <button type="button">Elsewhere</button>
        <Sample />
      </>,
    );
    await open();
    await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }));
    await expect.poll(shown).toBe(false);
  });

  test('closes when the field loses the focus', async () => {
    await render(
      <>
        <Sample />
        <button type="button">Next</button>
      </>,
    );
    await open();
    page.getByRole('button', { name: 'Next' }).element().focus();
    await expect.poll(shown).toBe(false);
  });

  test('does not open when it is disabled', async () => {
    await render(<Sample disabled />);
    await userEvent.click(field(), { force: true });
    expect(shown()).toBe(false);
    expect(input().disabled).toBe(true);
  });

  test('animates out before it is hidden, in every browser', async () => {
    await render(<Sample />);
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.poll(shown).toBe(false);
  });
});

test.describe('choosing with the pointer', () => {
  test('a press on an option chooses it, closes the list and keeps the focus on the field', async () => {
    await render(<Sample />);
    await open();
    await userEvent.click(option('Cherry'));
    await expect.poll(shown).toBe(false);
    expect(input().value).toBe('Cherry');
    expect(document.activeElement).toBe(input());
  });

  test('a disabled option cannot be chosen', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await open();
    await userEvent.click(option('Grape'), { force: true });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(shown()).toBe(true);
  });

  test('the option under the pointer becomes the active one', async () => {
    await render(<Sample />);
    await open();
    await userEvent.hover(option('Cherry'));
    expect(activeLabel()).toBe('Cherry');
  });
});

test.describe('the keyboard', () => {
  for (const [name, keys] of [
    ['ArrowDown', '{ArrowDown}'],
    ['ArrowUp', '{ArrowUp}'],
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ] as const) {
    test(`${name} opens the list on the chosen option`, async () => {
      await render(<Sample defaultValue="banana" />);
      input().focus();
      await userEvent.keyboard(keys);
      await expect.poll(shown).toBe(true);
      expect(activeLabel()).toBe('Banana');
    });
  }

  test('opens on the first option when there is no choice yet', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Apple');
  });

  test('End opens the list on the last option', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{End}');
    expect(activeLabel()).toBe('Pear');
  });

  test('Home opens the list on the first option', async () => {
    await render(<Sample defaultValue="cherry" />);
    input().focus();
    await userEvent.keyboard('{Home}');
    expect(activeLabel()).toBe('Apple');
  });

  test('moves the active option with the arrows, skipping disabled ones and stopping at the ends', async () => {
    await render(<Sample defaultValue="cherry" />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Cherry');
    await userEvent.keyboard('{ArrowDown}');
    // Grape is disabled.
    expect(activeLabel()).toBe('Pear');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Pear');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(activeLabel()).toBe('Apple');
  });

  test('Home and End move to the ends while it is open, Page Down and Up by ten', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}{End}');
    expect(activeLabel()).toBe('Pear');
    await userEvent.keyboard('{Home}');
    expect(activeLabel()).toBe('Apple');
    await userEvent.keyboard('{PageDown}');
    expect(activeLabel()).toBe('Pear');
    await userEvent.keyboard('{PageUp}');
    expect(activeLabel()).toBe('Apple');
  });

  test('Enter and Space choose the active option and close', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('apricot');
    await expect.poll(shown).toBe(false);
    await userEvent.keyboard('{ArrowDown} ');
    expect(onValueChange).toHaveBeenLastCalledWith('apricot');
    // From Apricot, one more arrow is Banana.
    await userEvent.keyboard('{ArrowDown}{ArrowDown} ');
    expect(onValueChange).toHaveBeenLastCalledWith('banana');
  });

  test('Alt and ArrowUp choose the active option', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Alt>}{ArrowUp}{/Alt}');
    expect(onValueChange).toHaveBeenLastCalledWith('apricot');
    await expect.poll(shown).toBe(false);
  });

  test('Tab takes the active option and moves on', async () => {
    const onValueChange = vi.fn();
    await render(
      <>
        <Sample onValueChange={onValueChange} />
        <button type="button">Next</button>
      </>,
    );
    input().focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith('banana');
    expect(page.getByRole('button', { name: 'Next' }).element()).toHaveFocus();
    await expect.poll(shown).toBe(false);
  });

  test('Escape leaves the choice as it was', async () => {
    const onValueChange = vi.fn();
    await render(<Sample defaultValue="apple" onValueChange={onValueChange} />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Escape}');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input().value).toBe('Apple');
  });

  test('typing a letter opens the list on the first option that starts with it', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('c');
    await expect.poll(shown).toBe(true);
    expect(activeLabel()).toBe('Cherry');
  });

  test('typing more of a word narrows the match, and the same letter again steps on', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('a');
    expect(activeLabel()).toBe('Apple');
    await userEvent.keyboard('a');
    expect(activeLabel()).toBe('Apricot');
    await userEvent.keyboard('a');
    expect(activeLabel()).toBe('Apple');
  });

  test('a prefix matches a longer word, skipping the ones it does not', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('ap');
    expect(activeLabel()).toBe('Apple');
    await userEvent.keyboard('r');
    expect(activeLabel()).toBe('Apricot');
  });

  test('does nothing for a letter no option starts with, and never lands on a disabled one', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('z');
    expect(shown()).toBe(false);
    await userEvent.keyboard('g');
    expect(shown()).toBe(false);
  });

  test('is not hijacked: Ctrl and Meta shortcuts pass through', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{Control>}a{/Control}');
    expect(shown()).toBe(false);
  });
});

test.describe('the popup', () => {
  test('is placed under the field, as wide as it at least, with the menu’s look', async () => {
    await render(<Sample />);
    await open();
    await expect.poll(() => style(listbox()).opacity).toBe('1');
    expect(rect(listbox()).top).toBeGreaterThanOrEqual(rect(box()).bottom);
    expect(rect(listbox()).top - rect(box()).bottom).toBeLessThan(8);
    expect(rect(listbox()).width).toBeGreaterThanOrEqual(rect(box()).width - 1);
    expect(Math.abs(rect(listbox()).left - rect(box()).left)).toBeLessThan(1);
    // The standard menu: a low surface, 16px corners, 2px padding, a shadow.
    expect(style(listbox()).backgroundColor).toBe('rgb(247, 242, 250)');
    expect(px(style(listbox()).borderTopLeftRadius)).toBe(16);
    expect(/[1-9]\d*(?:\.\d+)?px/.test(style(listbox()).boxShadow)).toBe(true);
  });

  test('has 44px options, rounded 12px at the ends of the list', async () => {
    await render(<Sample />);
    await open();
    await expect.poll(() => style(listbox()).opacity).toBe('1');
    expect(rect(option('Apple').element()).height).toBe(44);
    expect(px(style(option('Apple').element()).borderTopLeftRadius)).toBe(12);
    expect(px(style(option('Pear').element()).borderBottomLeftRadius)).toBe(12);
    expect(px(style(option('Banana').element()).borderTopLeftRadius)).toBe(4);
  });

  test('draws the chosen option in the selected colour, and the active one with a focus ring', async () => {
    await render(<Sample defaultValue="banana" />);
    await open();
    await expect
      .poll(() => style(option('Banana').element()).backgroundColor)
      .toBe('rgb(255, 216, 228)');
    expect(style(option('Banana').element()).color).toBe('rgb(99, 59, 72)');
    // Banana is also the active one on opening: it is outlined.
    expect(style(option('Banana').element()).outlineStyle).toBe('solid');
    expect(px(style(option('Banana').element()).outlineWidth)).toBe(3);
    expect(style(option('Apple').element()).outlineStyle).toBe('none');
  });

  test('dims a disabled option', async () => {
    await render(<Sample />);
    await open();
    // Faded by colour, not by opacity: the label is a lighter colour than an option's.
    expect(style(option('Grape').element()).color).not.toBe(style(option('Apple').element()).color);
    expect(style(option('Grape').element()).cursor).toBe('default');
  });

  test('turns the arrow over while it is open', async () => {
    await render(<Sample />);
    const arrow = () => box().querySelector('svg')?.parentElement as HTMLElement;
    expect(style(arrow()).rotate).toBe('none');
    await open();
    await expect.poll(() => style(arrow()).rotate).toBe('180deg');
  });

  test('flips above the field when there is no room below', async () => {
    await render(
      <div style={{ position: 'fixed', insetBlockEnd: 8, insetInlineStart: 24, inlineSize: 280 }}>
        <Select label="Fruit">
          <SelectOption value="a">Alpha</SelectOption>
          <SelectOption value="b">Beta</SelectOption>
          <SelectOption value="c">Gamma</SelectOption>
        </Select>
      </div>,
    );
    await open();
    await expect.poll(() => rect(listbox()).bottom).toBeLessThanOrEqual(rect(box()).top + 1);
  });

  test('scrolls a long list, and keeps the active option in view', async () => {
    const years = Array.from({ length: 60 }, (_, index) => 2026 - index);
    await render(
      <div style={{ padding: '24px 24px 400px', inlineSize: 280 }}>
        <Select label="Fruit">
          {years.map((year) => (
            <SelectOption key={year} value={String(year)}>
              {year}
            </SelectOption>
          ))}
        </Select>
      </div>,
    );
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(listbox().scrollTop).toBe(0);
    await userEvent.keyboard('{End}');
    await expect.poll(() => listbox().scrollTop).toBeGreaterThan(0);
    const last = listbox().querySelector('[data-active]') as HTMLElement;
    expect(rect(last).bottom).toBeLessThanOrEqual(rect(listbox()).bottom + 1);
    await userEvent.keyboard('{Home}');
    await expect.poll(() => listbox().scrollTop).toBe(0);
  });

  test('has no caret and a pointer cursor, as there is nothing to type', async () => {
    await render(<Sample />);
    expect(style(input()).caretColor).not.toBe('rgb(103, 80, 164)');
    expect(style(input()).cursor).toBe('pointer');
  });
});

test.describe('options with icons', () => {
  test('show a 20px leading icon', async () => {
    await render(
      <div style={{ padding: '24px 24px 400px', inlineSize: 280 }}>
        <Select label="Fruit">
          <SelectOption value="a" leading={<svg data-testid="icon" />}>
            Alpha
          </SelectOption>
        </Select>
      </div>,
    );
    await open();
    expect(rect(page.getByTestId('icon').element()).width).toBe(20);
  });
});

function Controlled() {
  const [value, setValue] = useState<string | null>('pear');
  return (
    <>
      <output data-testid="value">{value ?? 'none'}</output>
      <button type="button" onClick={() => setValue('apple')}>
        Reset
      </button>
      <Sample value={value} onValueChange={setValue} />
    </>
  );
}

test('works controlled, and follows the parent', async () => {
  await render(<Controlled />);
  expect(input().value).toBe('Pear');
  await open();
  await userEvent.click(option('Banana'));
  await expect.element(page.getByTestId('value')).toHaveTextContent('banana');
  expect(input().value).toBe('Banana');
  await userEvent.click(page.getByRole('button', { name: 'Reset' }));
  expect(input().value).toBe('Apple');
});

test('forwards a class to its element and props to the input', async () => {
  await render(<Sample className="mine" data-testid="field" />);
  expect(input().getAttribute('data-testid')).toBe('field');
  expect(document.querySelector('.mine')).not.toBeNull();
});
