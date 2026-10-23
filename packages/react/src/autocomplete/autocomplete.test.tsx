import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Autocomplete, AutocompleteOption, type AutocompleteProps } from './autocomplete.js';

const px = (value: string) => Number.parseFloat(value);
const rect = (el: Element) => el.getBoundingClientRect();
const style = (el: Element) => getComputedStyle(el);
const field = () => page.getByRole('combobox', { name: 'Fruit' });
const input = () => field().element() as HTMLInputElement;
// A closed popover is not in the accessibility tree, so look it up by attribute.
const listbox = () => document.querySelector('[role="listbox"]') as HTMLElement;
const shown = () => listbox().matches(':popover-open');
const option = (name: string) => page.getByRole('option', { name, exact: true });
const labels = () => [...listbox().querySelectorAll('[role="option"]')].map((o) => o.textContent);
const activeLabel = () => listbox().querySelector('[data-active]')?.textContent?.trim() ?? null;
const status = () => document.querySelector('[role="status"]')?.textContent ?? '';
const box = () => input().closest('[data-slot="field"]') as HTMLElement;

function Sample(props: Partial<AutocompleteProps>) {
  return (
    <div style={{ padding: '24px 24px 400px', inlineSize: 280 }}>
      <Autocomplete label="Fruit" {...props}>
        <AutocompleteOption value="apple">Apple</AutocompleteOption>
        <AutocompleteOption value="apricot">Apricot</AutocompleteOption>
        <AutocompleteOption value="banana">Banana</AutocompleteOption>
        <AutocompleteOption value="cherry">Cherry</AutocompleteOption>
        <AutocompleteOption value="grape" disabled>
          Grape
        </AutocompleteOption>
        <AutocompleteOption value="pear">Pear</AutocompleteOption>
        <AutocompleteOption value="cafe">Café</AutocompleteOption>
      </Autocomplete>
      <button type="button">Next</button>
    </div>
  );
}

function ControlledSample() {
  const [value, setValue] = useState<string | null>('apple');
  return (
    <>
      <Sample value={value} onValueChange={setValue} />
      <button type="button" onClick={() => setValue('pear')}>
        Pear please
      </button>
      <button type="button" onClick={() => setValue(null)}>
        Nothing please
      </button>
    </>
  );
}

/** Opens it with a press, repeated while the field still says it is closed (a busy Firefox drops one). */
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

/** Moves the focus to the next thing on the page: a Tab press would do, but a Firefox page with nothing after the field keeps it. */
const leave = () => (page.getByRole('button', { name: 'Next' }).element() as HTMLElement).focus();

/** Types into the focused field, one key at a time as a person does. */
const type = async (text: string) => {
  input().focus();
  await userEvent.keyboard(text);
};

test.describe('semantics', () => {
  test('is an editable combobox that offers a list and names a listbox', async () => {
    await render(<Sample />);
    await expect.element(field()).toBeVisible();
    expect(input()).toHaveAttribute('aria-autocomplete', 'list');
    expect(input()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input().getAttribute('aria-controls')).toBe(listbox().id);
    expect(input().readOnly).toBe(false);
    expect(input().autocomplete).toBe('off');
  });

  test('has a listbox of options, named by the label, once it is open', async () => {
    await render(<Sample />);
    await open();
    await expect.element(page.getByRole('listbox', { name: 'Fruit' })).toBeVisible();
    expect(labels()).toEqual(['Apple', 'Apricot', 'Banana', 'Cherry', 'Grape', 'Pear', 'Café']);
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
    expect(document.activeElement).toBe(input());
    expect(input().getAttribute('aria-activedescendant')).toBe(option('Apple').element().id);
  });

  test('has no active descendant while closed', async () => {
    await render(<Sample />);
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
  });

  test('takes a TextField’s label, supporting text and error', async () => {
    await render(<Sample supportingText="Pick one" error errorText="Not on the menu" />);
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(document.body.textContent).toContain('Not on the menu');
  });

  test('throws a helpful error when an option is used alone', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<AutocompleteOption value="x">X</AutocompleteOption>)).rejects.toThrow(
      /inside <Autocomplete>/,
    );
    error.mockRestore();
  });
});

test.describe('typing', () => {
  test('narrows the options to those that contain what is typed', async () => {
    await render(<Sample />);
    await open();
    await type('ap');
    // Apple, Apricot and Grape (disabled, but still a match); Pear has "ea", not "ap".
    expect(labels()).toEqual(['Apple', 'Apricot', 'Grape']);
  });

  test('ignores case and accents, both ways', async () => {
    await render(<Sample />);
    await type('CAFE');
    expect(labels()).toEqual(['Café']);
  });

  test('opens the list as soon as there is something typed', async () => {
    await render(<Sample />);
    await type('b');
    expect(shown()).toBe(true);
    expect(input()).toHaveAttribute('aria-expanded', 'true');
  });

  test('puts the part that matched in bold', async () => {
    await render(<Sample />);
    await type('pric');
    const match = listbox().querySelector('[data-match]') as HTMLElement;
    expect(match.textContent).toBe('pric');
    expect(px(style(match).fontWeight)).toBeGreaterThanOrEqual(700);
    expect(option('Apricot').element().textContent).toBe('Apricot');
  });

  test('says there are no results when nothing matches', async () => {
    await render(<Sample />);
    await type('zzz');
    expect(labels()).toEqual([]);
    expect(listbox().textContent).toContain('No results');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
  });

  test('says nothing when told not to, and then does not open on no match', async () => {
    await render(<Sample emptyText="" />);
    await type('zzz');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  test('tells a screen reader how many matches there are', async () => {
    await render(<Sample />);
    await type('ap');
    await expect.poll(status).toBe('3 results available');
    await type('r');
    await expect.poll(status).toBe('1 result available');
    await type('zz');
    await expect.poll(status).toBe('No results');
  });

  test('offers everything again once an option is chosen, not only the match', async () => {
    await render(<Sample />);
    await type('ban');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(input().value).toBe('Banana');
    await userEvent.keyboard('{ArrowDown}');
    expect(labels()).toHaveLength(7);
  });

  test('a custom filter decides which options are offered', async () => {
    await render(
      <Sample filter={(option, query) => option.text.toLowerCase().startsWith(query)} />,
    );
    await type('a');
    expect(labels()).toEqual(['Apple', 'Apricot']);
  });

  test('filter={false} offers every option however much is typed', async () => {
    await render(<Sample filter={false} />);
    await type('zzz');
    expect(labels()).toHaveLength(7);
  });
});

test.describe('the value', () => {
  test('shows the chosen option’s text in the field', async () => {
    await render(<Sample defaultValue="banana" />);
    expect(input().value).toBe('Banana');
  });

  test('is uncontrolled by default, and reports each choice', async () => {
    const onValueChange = vi.fn();
    const onInputValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} onInputValueChange={onInputValueChange} />);
    await type('cher');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(input().value).toBe('Cherry');
    expect(onValueChange).toHaveBeenLastCalledWith('cherry');
    expect(onInputValueChange).toHaveBeenCalledWith('c', 'input');
    expect(onInputValueChange).toHaveBeenLastCalledWith('Cherry', 'select');
  });

  test('a press on an option chooses it, closes the list and keeps the focus on the field', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await open();
    await option('Pear').click();
    expect(onValueChange).toHaveBeenCalledWith('pear');
    expect(input().value).toBe('Pear');
    await expect.poll(shown).toBe(false);
    expect(document.activeElement).toBe(input());
  });

  test('a disabled option cannot be chosen', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await open();
    await option('Grape').click({ force: true });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(shown()).toBe(true);
  });

  test('stays on the value it is given until the parent changes it', async () => {
    const onValueChange = vi.fn();
    await render(<Sample value="apple" onValueChange={onValueChange} />);
    await open();
    await option('Pear').click();
    expect(onValueChange).toHaveBeenCalledWith('pear');
    // The parent did not take it: the field says what it was given.
    await expect.poll(() => input().value).toBe('Apple');
  });

  test('follows a value the parent changes', async () => {
    await render(<ControlledSample />);
    expect(input().value).toBe('Apple');
    await page.getByRole('button', { name: 'Pear please' }).click();
    await expect.poll(() => input().value).toBe('Pear');
    await page.getByRole('button', { name: 'Nothing please' }).click();
    await expect.poll(() => input().value).toBe('');
  });

  test('starts empty for no value', async () => {
    await render(<Sample />);
    expect(input().value).toBe('');
  });

  test('the text can be controlled too', async () => {
    const onInputValueChange = vi.fn();
    await render(<Sample inputValue="ban" onInputValueChange={onInputValueChange} />);
    expect(input().value).toBe('ban');
    await userEvent.click(field());
    await userEvent.keyboard('a');
    expect(onInputValueChange).toHaveBeenCalledWith('bana', 'input');
    expect(input().value).toBe('ban');
  });

  test('takes the text of an option from textValue when its children are not text', async () => {
    await render(
      <Autocomplete label="Fruit">
        <AutocompleteOption value="a" textValue="Alpha">
          <b>Alpha</b>
        </AutocompleteOption>
      </Autocomplete>,
    );
    await type('alp');
    expect(labels()).toEqual(['Alpha']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(input().value).toBe('Alpha');
  });

  test('finds options inside fragments', async () => {
    const nested = (
      <>
        <AutocompleteOption value="a">Alpha</AutocompleteOption>
        {/* biome-ignore lint/complexity/noUselessFragments: the nesting is what is being tested. */}
        <>
          <AutocompleteOption value="b">Beta</AutocompleteOption>
        </>
      </>
    );
    await render(<Autocomplete label="Fruit">{nested}</Autocomplete>);
    await open();
    expect(labels()).toEqual(['Alpha', 'Beta']);
  });

  test('submits the chosen value with a form under its name', async () => {
    await render(
      <form data-testid="form">
        <Sample name="fruit" defaultValue="pear" />
      </form>,
    );
    const data = new FormData(document.querySelector('form') as HTMLFormElement);
    expect(data.get('fruit')).toBe('pear');
  });
});

test.describe('leaving the field', () => {
  test('puts back the text of what is chosen', async () => {
    const onInputValueChange = vi.fn();
    await render(<Sample defaultValue="apple" onInputValueChange={onInputValueChange} />);
    await open();
    await type('xyz');
    leave();
    await expect.poll(() => input().value).toBe('Apple');
    expect(onInputValueChange).toHaveBeenLastCalledWith('Apple', 'reset');
  });

  test('clears text that was typed when nothing is chosen', async () => {
    await render(<Sample />);
    await type('xyz');
    leave();
    await expect.poll(() => input().value).toBe('');
  });

  test('emptying the field lets go of the choice', async () => {
    const onValueChange = vi.fn();
    await render(<Sample defaultValue="apple" onValueChange={onValueChange} />);
    input().focus();
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  test('closes when it loses the focus', async () => {
    await render(<Sample />);
    await open();
    leave();
    await expect.poll(shown).toBe(false);
  });

  test('closes on a press elsewhere', async () => {
    await render(
      <>
        <Sample />
        <button type="button">Elsewhere</button>
      </>,
    );
    await open();
    await page.getByRole('button', { name: 'Elsewhere' }).click();
    await expect.poll(shown).toBe(false);
  });
});

test.describe('the keyboard', () => {
  test('ArrowDown opens the list on the chosen option, or the first when there is no choice', async () => {
    await render(<Sample defaultValue="banana" />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(shown()).toBe(true);
    expect(activeLabel()).toBe('Banana');
  });

  test('ArrowDown on an empty field opens on the first option', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Apple');
  });

  test('ArrowUp opens the list on the last option', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(activeLabel()).toBe('Café');
  });

  test('moves the active option with the arrows, skipping disabled ones and stopping at the ends', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Apple');
    await userEvent.keyboard('{ArrowUp}');
    expect(activeLabel()).toBe('Apple');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(activeLabel()).toBe('Cherry');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Pear');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(activeLabel()).toBe('Café');
  });

  test('opening on a press puts the active option on the chosen one, scrolled into view', async () => {
    const names = Array.from({ length: 30 }, (_, i) => `Fruit ${String(i).padStart(2, '0')}`);
    await render(
      <Autocomplete label="Fruit" defaultValue="Fruit 25">
        {names.map((name) => (
          <AutocompleteOption key={name} value={name}>
            {name}
          </AutocompleteOption>
        ))}
      </Autocomplete>,
    );
    await open();
    await expect.poll(activeLabel).toBe('Fruit 25');
    await expect
      .poll(() => {
        const row = listbox().querySelector('[data-active]') as HTMLElement;
        return rect(row).top >= rect(listbox()).top && rect(row).bottom <= rect(listbox()).bottom;
      })
      .toBe(true);
  });

  test('opening on a press highlights nothing when nothing is chosen', async () => {
    await render(<Sample />);
    await open();
    expect(activeLabel()).toBe(null);
  });

  test('Home and End move the caret, not the active option', async () => {
    await render(<Sample defaultValue="banana" />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}{Home}');
    expect(input().selectionStart).toBe(0);
    expect(activeLabel()).toBe('Banana');
  });

  test('Enter chooses the active option and closes', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(input().value).toBe('Apricot');
    await expect.poll(shown).toBe(false);
  });

  test('Enter with no active option does nothing to the choice', async () => {
    const onValueChange = vi.fn();
    await render(<Sample onValueChange={onValueChange} />);
    await type('ban');
    await userEvent.keyboard('{Enter}');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test('autoHighlight makes Enter choose the first match', async () => {
    const onValueChange = vi.fn();
    await render(<Sample autoHighlight onValueChange={onValueChange} />);
    await type('ch');
    expect(activeLabel()).toBe('Cherry');
    await userEvent.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('cherry');
  });

  test('Escape closes the list, then clears the field', async () => {
    const onValueChange = vi.fn();
    const onInputValueChange = vi.fn();
    await render(
      <Sample
        defaultValue="apple"
        onValueChange={onValueChange}
        onInputValueChange={onInputValueChange}
      />,
    );
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.poll(shown).toBe(false);
    expect(input().value).toBe('Apple');
    expect(document.activeElement).toBe(input());
    await userEvent.keyboard('{Escape}');
    expect(input().value).toBe('');
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(onInputValueChange).toHaveBeenLastCalledWith('', 'clear');
  });

  test('Alt and ArrowDown open the list without moving, Alt and ArrowUp close it', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(shown()).toBe(true);
    expect(activeLabel()).toBe(null);
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    await expect.poll(shown).toBe(false);
  });

  test('Page Down and Up move by ten, stopping at the ends', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}{PageDown}');
    expect(activeLabel()).toBe('Café');
    await userEvent.keyboard('{PageUp}');
    expect(activeLabel()).toBe('Apple');
  });

  test('is not hijacked: Ctrl and Meta shortcuts, and typing, pass through', async () => {
    await render(<Sample />);
    input().focus();
    await userEvent.keyboard('{Control>}a{/Control}');
    expect(shown()).toBe(false);
  });
});

test.describe('the free text mode', () => {
  test('Enter commits what was typed as the value', async () => {
    const onValueChange = vi.fn();
    await render(<Sample freeSolo onValueChange={onValueChange} />);
    await type('Kumquat');
    await userEvent.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('Kumquat');
    expect(input().value).toBe('Kumquat');
    await expect.poll(shown).toBe(false);
  });

  test('leaving the field commits it too, and keeps the text', async () => {
    const onValueChange = vi.fn();
    await render(<Sample freeSolo onValueChange={onValueChange} />);
    await type('Kumquat');
    leave();
    await expect.poll(() => onValueChange.mock.lastCall?.[0]).toBe('Kumquat');
    expect(input().value).toBe('Kumquat');
  });

  test('choosing an option commits the option’s value', async () => {
    const onValueChange = vi.fn();
    await render(<Sample freeSolo onValueChange={onValueChange} />);
    await type('ban');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('banana');
  });

  test('emptied, it is no value', async () => {
    const onValueChange = vi.fn();
    await render(<Sample freeSolo defaultValue="Kumquat" onValueChange={onValueChange} />);
    expect(input().value).toBe('Kumquat');
    input().focus();
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
    leave();
    await expect.poll(() => onValueChange.mock.lastCall?.[0]).toBe(null);
  });

  test('has no arrow button, as there is no fixed list to open', async () => {
    await render(<Sample freeSolo />);
    expect(document.querySelector('[data-slot="toggle"]')).toBeNull();
  });
});

test.describe('loading', () => {
  test('says so under the options, and tells a screen reader', async () => {
    await render(<Sample loading />);
    await open();
    expect(listbox().textContent).toContain('Loading…');
    await expect.poll(status).toBe('Loading…');
  });

  test('can say it in other words', async () => {
    await render(<Sample loading loadingText="Un instant…" />);
    await open();
    expect(listbox().textContent).toContain('Un instant…');
  });
});

test.describe('the buttons', () => {
  test('a clear button appears with text, empties the field and keeps the focus', async () => {
    const onInputValueChange = vi.fn();
    await render(<Sample defaultValue="apple" onInputValueChange={onInputValueChange} />);
    const clear = page.getByRole('button', { name: 'Clear' });
    await clear.click();
    expect(input().value).toBe('');
    expect(onInputValueChange).toHaveBeenLastCalledWith('', 'clear');
    expect(document.activeElement).toBe(input());
    expect(document.querySelector('[data-slot="clear"]')).toBeNull();
  });

  test('there is no clear button on an empty field, or when it is not clearable', async () => {
    await render(<Sample />);
    expect(document.querySelector('[data-slot="clear"]')).toBeNull();
  });

  test('clearable off removes it', async () => {
    await render(<Sample defaultValue="apple" clearable={false} />);
    expect(document.querySelector('[data-slot="clear"]')).toBeNull();
  });

  test('the arrow button opens and closes the list, and turns over', async () => {
    await render(<Sample />);
    const toggle = page.getByRole('button', { name: 'Show options' });
    await toggle.click();
    expect(shown()).toBe(true);
    const arrow = document.querySelector('[data-slot="toggle"] > svg') as SVGElement;
    await expect.poll(() => style(arrow).rotate).toBe('180deg');
    await page.getByRole('button', { name: 'Hide options' }).click();
    await expect.poll(shown).toBe(false);
  });

  test('neither button is a tab stop: the keyboard has the field', async () => {
    await render(<Sample defaultValue="apple" />);
    for (const slot of ['clear', 'toggle']) {
      expect((document.querySelector(`[data-slot="${slot}"]`) as HTMLButtonElement).tabIndex).toBe(
        -1,
      );
    }
  });
});

test.describe('opening', () => {
  test('leaves the layout while closed, so nothing invisible takes presses or is read', async () => {
    await render(<Sample />);
    expect(style(listbox()).display).toBe('none');
  });

  test('opens when the field is pressed', async () => {
    await render(<Sample />);
    await userEvent.click(field());
    expect(shown()).toBe(true);
  });

  test('opens on focus when asked to', async () => {
    await render(<Sample openOnFocus />);
    input().focus();
    await expect.poll(shown).toBe(true);
  });

  test('does not open when it is disabled or read-only', async () => {
    await render(<Sample disabled />);
    await userEvent.click(field(), { force: true });
    expect(shown()).toBe(false);
  });

  test('does not open when it is read-only', async () => {
    await render(<Sample readOnly />);
    await userEvent.click(field());
    expect(shown()).toBe(false);
  });

  test('the option under the pointer becomes the active one', async () => {
    await render(<Sample />);
    await open();
    await option('Cherry').hover();
    await expect.poll(activeLabel).toBe('Cherry');
  });

  test('animates out before it is hidden', async () => {
    await render(<Sample />);
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.poll(shown, { timeout: 3000 }).toBe(false);
  });
});

test.describe('the popup', () => {
  test('is placed under the field, as wide as it at least', async () => {
    await render(<Sample />);
    await open();
    await expect.poll(() => rect(listbox()).top).toBeGreaterThan(rect(box()).bottom - 1);
    expect(rect(listbox()).width).toBeGreaterThanOrEqual(rect(box()).width - 1);
    expect(Math.abs(rect(listbox()).left - rect(box()).left)).toBeLessThan(2);
  });

  test('has 44px options, rounded 12px at the ends of the list', async () => {
    await render(<Sample />);
    await open();
    expect(rect(option('Apple').element()).height).toBe(44);
    expect(px(style(option('Apple').element()).borderTopLeftRadius)).toBe(12);
    expect(px(style(option('Café').element()).borderBottomLeftRadius)).toBe(12);
    expect(px(style(option('Banana').element()).borderTopLeftRadius)).toBe(4);
  });

  test('draws the active option with a focus ring', async () => {
    await render(<Sample />);
    await open();
    await userEvent.keyboard('{ArrowDown}');
    const active = listbox().querySelector('[data-active]') as HTMLElement;
    expect(style(active).outlineStyle).toBe('solid');
  });

  test('flips above the field when there is no room below', async () => {
    await render(
      <div style={{ position: 'fixed', insetBlockEnd: 8, insetInlineStart: 24, inlineSize: 280 }}>
        <Autocomplete label="Fruit">
          {Array.from({ length: 8 }, (_, i) => `Fruit number ${i}`).map((name) => (
            <AutocompleteOption key={name} value={name}>
              {name}
            </AutocompleteOption>
          ))}
        </Autocomplete>
      </div>,
    );
    await open();
    await expect.poll(() => rect(listbox()).bottom).toBeLessThanOrEqual(rect(box()).top + 1);
  });
});

test.describe('options with icons', () => {
  test('show a 20px leading icon', async () => {
    await render(
      <Autocomplete label="Fruit">
        <AutocompleteOption value="a" leading={<svg aria-hidden="true" data-testid="icon" />}>
          Alpha
        </AutocompleteOption>
      </Autocomplete>,
    );
    await open();
    const icon = document.querySelector('[data-testid="icon"]') as SVGElement;
    expect(rect(icon.parentElement as HTMLElement).width).toBe(20);
  });
});

test('forwards a class to its element and props to the input', async () => {
  await render(<Sample className="mine" data-testid="ac" />);
  expect(input().getAttribute('data-testid')).toBe('ac');
  expect(document.querySelector('.mine')).not.toBeNull();
});
