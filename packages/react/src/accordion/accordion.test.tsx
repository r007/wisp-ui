import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Accordion, AccordionItem } from './accordion.js';

const px = (value: string) => Number.parseFloat(value);
const style = (el: Element) => getComputedStyle(el);
const header = (name: string) => page.getByRole('button', { name }).element() as HTMLButtonElement;
const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="item"]')];
const panelOf = (name: string) =>
  document.getElementById(header(name).getAttribute('aria-controls') as string) as HTMLElement;
const expanded = (name: string) => header(name).getAttribute('aria-expanded') === 'true';

const EIGHT = [0, 1, 2, 3, 4, 5, 6, 7];

const three = (
  <>
    <AccordionItem value="a" title="Alpha">
      <button type="button">Inside alpha</button>
    </AccordionItem>
    <AccordionItem value="b" title="Beta">
      Beta content
    </AccordionItem>
    <AccordionItem value="c" title="Gamma">
      Gamma content
    </AccordionItem>
  </>
);

test('each header is a button in a level 3 heading, named by its title, closed by default', async () => {
  await render(<Accordion>{three}</Accordion>);
  expect(page.getByRole('heading', { level: 3 }).elements()).toHaveLength(3);
  for (const name of ['Alpha', 'Beta', 'Gamma']) {
    expect(header(name).getAttribute('aria-expanded')).toBe('false');
    expect(header(name).closest('h3')).not.toBeNull();
  }
});

test('the heading level can be changed', async () => {
  await render(
    <Accordion>
      <AccordionItem value="a" title="Alpha" headingLevel={5}>
        x
      </AccordionItem>
    </Accordion>,
  );
  expect(header('Alpha').closest('h5')).not.toBeNull();
});

test('a closed panel is inert and its content cannot be reached', async () => {
  await render(<Accordion>{three}</Accordion>);
  expect(panelOf('Alpha').inert).toBe(true);
  await userEvent.tab();
  await userEvent.tab();
  // Alpha's header, then Beta's: not the button inside Alpha's closed panel.
  expect(document.activeElement).toBe(header('Beta'));
});

test('opens on click, and the panel is a region named by its header', async () => {
  await render(<Accordion>{three}</Accordion>);
  await page.getByRole('button', { name: 'Alpha' }).click();
  expect(expanded('Alpha')).toBe(true);
  expect(panelOf('Alpha').inert).toBe(false);
  await expect.element(page.getByRole('region', { name: 'Alpha' })).toBeVisible();
  expect(header('Alpha').getAttribute('aria-controls')).toBe(panelOf('Alpha').id);
});

test('closes on a second click', async () => {
  await render(<Accordion defaultValue={['a']}>{three}</Accordion>);
  expect(expanded('Alpha')).toBe(true);
  await page.getByRole('button', { name: 'Alpha' }).click();
  expect(expanded('Alpha')).toBe(false);
});

test('opens with Enter and with Space', async () => {
  await render(<Accordion>{three}</Accordion>);
  header('Alpha').focus();
  await userEvent.keyboard('{Enter}');
  expect(expanded('Alpha')).toBe(true);
  header('Beta').focus();
  await userEvent.keyboard(' ');
  expect(expanded('Beta')).toBe(true);
});

test('opening one closes the others, unless several may be open', async () => {
  await render(<Accordion defaultValue={['a']}>{three}</Accordion>);
  await page.getByRole('button', { name: 'Beta' }).click();
  expect(expanded('Alpha')).toBe(false);
  expect(expanded('Beta')).toBe(true);
});

test('with multiple, items stay open independently', async () => {
  await render(
    <Accordion multiple defaultValue={['a']}>
      {three}
    </Accordion>,
  );
  await page.getByRole('button', { name: 'Beta' }).click();
  expect(expanded('Alpha')).toBe(true);
  expect(expanded('Beta')).toBe(true);
  await page.getByRole('button', { name: 'Alpha' }).click();
  expect(expanded('Alpha')).toBe(false);
  expect(expanded('Beta')).toBe(true);
});

test('reports the open items as an array', async () => {
  const onValueChange = vi.fn();
  await render(
    <Accordion multiple onValueChange={onValueChange}>
      {three}
    </Accordion>,
  );
  await page.getByRole('button', { name: 'Gamma' }).click();
  expect(onValueChange).toHaveBeenLastCalledWith(['c']);
  await page.getByRole('button', { name: 'Alpha' }).click();
  expect(onValueChange).toHaveBeenLastCalledWith(['c', 'a']);
  await page.getByRole('button', { name: 'Gamma' }).click();
  expect(onValueChange).toHaveBeenLastCalledWith(['a']);
});

test('controlled: the value decides, and a click only asks', async () => {
  const onValueChange = vi.fn();
  const { rerender } = await render(
    <Accordion value={['b']} onValueChange={onValueChange}>
      {three}
    </Accordion>,
  );
  expect(expanded('Beta')).toBe(true);
  await page.getByRole('button', { name: 'Alpha' }).click();
  expect(onValueChange).toHaveBeenCalledWith(['a']);
  // Not applied, as the parent did not change `value`.
  expect(expanded('Alpha')).toBe(false);
  expect(expanded('Beta')).toBe(true);
  await rerender(
    <Accordion value={['a']} onValueChange={onValueChange}>
      {three}
    </Accordion>,
  );
  expect(expanded('Alpha')).toBe(true);
  expect(expanded('Beta')).toBe(false);
});

test('arrow keys, Home and End move between the headers, wrapping', async () => {
  await render(<Accordion>{three}</Accordion>);
  header('Alpha').focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(header('Beta'));
  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  expect(document.activeElement).toBe(header('Alpha'));
  await userEvent.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(header('Gamma'));
  await userEvent.keyboard('{Home}');
  expect(document.activeElement).toBe(header('Alpha'));
  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(header('Gamma'));
});

test('a disabled item cannot be opened and the arrow keys skip it', async () => {
  const onValueChange = vi.fn();
  await render(
    <Accordion onValueChange={onValueChange}>
      <AccordionItem value="a" title="Alpha">
        x
      </AccordionItem>
      <AccordionItem value="b" title="Beta" disabled>
        y
      </AccordionItem>
      <AccordionItem value="c" title="Gamma">
        z
      </AccordionItem>
    </Accordion>,
  );
  expect(header('Beta').disabled).toBe(true);
  header('Alpha').focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(header('Gamma'));
  await page.getByRole('button', { name: 'Beta' }).click({ force: true });
  expect(onValueChange).not.toHaveBeenCalled();
});

test('with many items open at once the panels are not regions', async () => {
  const many = EIGHT.map((n) => (
    <AccordionItem key={n} value={`i${n}`} title={`Item ${n}`}>
      Content {n}
    </AccordionItem>
  ));
  await render(<Accordion multiple>{many}</Accordion>);
  expect(panelOf('Item 0').hasAttribute('role')).toBe(false);
});

test('a single accordion keeps its regions however many items it has', async () => {
  const many = EIGHT.map((n) => (
    <AccordionItem key={n} value={`i${n}`} title={`Item ${n}`}>
      Content {n}
    </AccordionItem>
  ));
  await render(<Accordion>{many}</Accordion>);
  expect(panelOf('Item 0').getAttribute('role')).toBe('region');
});

test('forwards a ref, class and props', async () => {
  let node: HTMLDivElement | null = null;
  await render(
    <Accordion
      className="mine"
      data-testid="acc"
      ref={(el) => {
        node = el;
      }}
    >
      {three}
    </Accordion>,
  );
  expect(node).toBe(document.querySelector('[data-testid="acc"]'));
  expect((node as unknown as HTMLElement).classList.contains('mine')).toBe(true);
});

test('throws outside an accordion', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(
    render(
      <AccordionItem value="a" title="Alone">
        x
      </AccordionItem>,
    ),
  ).rejects.toThrow(/inside <Accordion>/);
  error.mockRestore();
});

test.describe('segmented', () => {
  test('headers are 56px tall, the title is the medium title style', async () => {
    await render(<Accordion>{three}</Accordion>);
    expect(header('Alpha').getBoundingClientRect().height).toBe(56);
    expect(
      px(
        style(header('Alpha').querySelector('span:not([data-wisp-state-layer])') as Element)
          .fontSize,
      ),
    ).toBeGreaterThan(0);
  });

  test('items are 2px apart, rounder at the ends of the group', async () => {
    await render(<Accordion>{three}</Accordion>);
    const [first, middle, last] = items() as [HTMLElement, HTMLElement, HTMLElement];
    expect(middle.getBoundingClientRect().top - first.getBoundingClientRect().bottom).toBe(2);
    expect(px(style(first).borderTopLeftRadius)).toBe(16);
    expect(px(style(first).borderBottomLeftRadius)).toBe(4);
    expect(px(style(middle).borderTopLeftRadius)).toBe(4);
    expect(px(style(last).borderBottomLeftRadius)).toBe(16);
    expect(px(style(last).borderTopLeftRadius)).toBe(4);
  });

  test('the open item rounds all its corners, and its header keeps square lower ones', async () => {
    await render(<Accordion defaultValue={['b']}>{three}</Accordion>);
    const middle = items()[1] as HTMLElement;
    await expect.poll(() => px(style(middle).borderTopLeftRadius)).toBe(16);
    expect(px(style(middle).borderBottomRightRadius)).toBe(16);
    expect(px(style(header('Beta')).borderBottomLeftRadius)).toBe(0);
  });

  test('the open item is on a higher surface', async () => {
    await render(<Accordion defaultValue={['b']}>{three}</Accordion>);
    const [closed, open] = items() as [HTMLElement, HTMLElement];
    await expect
      .poll(() => style(open).backgroundColor !== style(closed).backgroundColor)
      .toBe(true);
  });

  test('the chevron turns upside down when open', async () => {
    await render(<Accordion defaultValue={['b']}>{three}</Accordion>);
    const chevron = (name: string) => header(name).querySelector('svg') as SVGElement;
    await expect.poll(() => style(chevron('Beta')).transform).toMatch(/matrix\(-1/);
    expect(style(chevron('Alpha')).transform).toBe('none');
  });

  test('a panel folds open: its height grows from nothing to its content', async () => {
    await render(<Accordion>{three}</Accordion>);
    const panel = panelOf('Beta');
    expect(panel.getBoundingClientRect().height).toBe(0);
    await page.getByRole('button', { name: 'Beta' }).click();
    await expect.poll(() => panel.getBoundingClientRect().height).toBeGreaterThan(20);
  });

  test('a leading icon indents the content to line up with the title', async () => {
    await render(
      <Accordion defaultValue={['a']}>
        <AccordionItem value="a" title="Alpha" leading={<svg aria-hidden="true" />}>
          x
        </AccordionItem>
      </Accordion>,
    );
    const content = panelOf('Alpha').querySelector('[data-slot="content"]') as HTMLElement;
    expect(px(style(content).paddingInlineStart)).toBe(56);
  });
});

test.describe('flat', () => {
  test('has no surface and a rule between items', async () => {
    await render(<Accordion variant="flat">{three}</Accordion>);
    const [first, , last] = items() as [HTMLElement, HTMLElement, HTMLElement];
    expect(style(first).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(px(style(first).borderBottomWidth)).toBe(1);
    expect(px(style(last).borderBottomWidth)).toBe(0);
    expect(px(style(first).borderTopLeftRadius)).toBe(0);
  });
});

test('hover tints the header', async () => {
  await render(<Accordion>{three}</Accordion>);
  await page.getByRole('button', { name: 'Alpha' }).hover();
  const layer = header('Alpha').querySelector('[data-wisp-state-layer]') as HTMLElement;
  await expect.poll(() => px(getComputedStyle(layer, '::before').opacity)).toBeCloseTo(0.08, 2);
});

test('keyboard focus shows a ring inside the header', async () => {
  await render(<Accordion>{three}</Accordion>);
  await userEvent.tab();
  expect(document.activeElement).toBe(header('Alpha'));
  expect(style(header('Alpha')).outlineStyle).toBe('solid');
  expect(px(style(header('Alpha')).outlineOffset)).toBe(-3);
});

test('is laid out right to left in an RTL page', async () => {
  await render(
    <div dir="rtl">
      <Accordion>{three}</Accordion>
    </div>,
  );
  const chevron = header('Alpha').querySelector('svg') as SVGElement;
  const text = header('Alpha').querySelector('span:not([data-wisp-state-layer])') as HTMLElement;
  // The title starts at the right and the chevron is at the left.
  expect(chevron.getBoundingClientRect().left).toBeLessThan(text.getBoundingClientRect().left);
});
