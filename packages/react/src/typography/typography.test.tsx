import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import theme from '../../../tokens/src/theme.generated.css?raw';
import { TYPOGRAPHY_VARIANTS, Typography } from './typography.js';

const style = (el: Element) => getComputedStyle(el);
const rootPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
const text = () => page.getByText('Sample text').element() as HTMLElement;

/** One type style as the theme defines it: `500 0.875rem/1.25rem var(…)` and its tracking. */
interface Token {
  weight: string;
  size: number;
  lineHeight: number;
  tracking: number;
}

/** Every `--md-sys-typescale-*` token in the generated theme, by name without the prefix. */
const tokens = (() => {
  const found = new Map<string, Token>();
  const font =
    /--md-sys-typescale-([a-z-]+): (\d+) ([\d.]+)rem\/([\d.]+)rem var\(--md-ref-typeface-\w+\);/g;
  for (const [, name, weight, size, lineHeight] of theme.matchAll(font)) {
    const tracking = new RegExp(`--md-sys-typescale-${name}-tracking: (-?[\\d.]+)rem;`).exec(theme);
    found.set(name as string, {
      weight: weight as string,
      size: Number(size),
      lineHeight: Number(lineHeight),
      tracking: Number(tracking?.[1]),
    });
  }
  return found;
})();

test('has a style for every type token the theme defines, and no more', () => {
  const styles = TYPOGRAPHY_VARIANTS.flatMap((variant) => [variant, `emphasized-${variant}`]);
  expect([...tokens.keys()].sort()).toEqual([...styles].sort());
  expect(tokens.size).toBe(30);
});

test('has the five roles in three sizes each', () => {
  expect(TYPOGRAPHY_VARIANTS).toHaveLength(15);
  for (const role of ['display', 'headline', 'title', 'body', 'label']) {
    for (const size of ['large', 'medium', 'small']) {
      expect(TYPOGRAPHY_VARIANTS).toContain(`${role}-${size}`);
    }
  }
});

for (const variant of TYPOGRAPHY_VARIANTS) {
  for (const emphasized of [false, true]) {
    const name = emphasized ? `emphasized-${variant}` : variant;
    test(`${name} sets the font and the tracking its token defines`, async () => {
      await render(
        <Typography variant={variant} emphasized={emphasized}>
          Sample text
        </Typography>,
      );
      const token = tokens.get(name) as Token;
      expect(style(text()).fontWeight).toBe(token.weight);
      expect(Number.parseFloat(style(text()).fontSize)).toBeCloseTo(token.size * rootPx, 2);
      expect(Number.parseFloat(style(text()).lineHeight)).toBeCloseTo(token.lineHeight * rootPx, 2);
      // `letter-spacing: 0` computes to `normal` or `0px`.
      const tracking = style(text()).letterSpacing;
      expect(tracking === 'normal' ? 0 : Number.parseFloat(tracking)).toBeCloseTo(
        token.tracking * rootPx,
        2,
      );
    });
  }
}

test('is body-medium unless told otherwise', async () => {
  await render(<Typography>Sample text</Typography>);
  expect(text()).toHaveAttribute('data-variant', 'body-medium');
  expect(style(text()).fontSize).toBe('14px');
});

test('the emphasised form is heavier than the plain one in the same size', async () => {
  await render(
    <>
      <Typography variant="title-medium">Plain</Typography>
      <Typography variant="title-medium" emphasized>
        Strong
      </Typography>
    </>,
  );
  const weight = (label: string) => Number(style(page.getByText(label).element()).fontWeight);
  expect(weight('Strong')).toBeGreaterThan(weight('Plain'));
});

test.describe('the element', () => {
  test('is a paragraph for body text, a span for a label and a div for the rest', async () => {
    const { rerender } = await render(<Typography variant="body-large">Sample text</Typography>);
    expect(text().tagName).toBe('P');
    await rerender(<Typography variant="label-small">Sample text</Typography>);
    expect(text().tagName).toBe('SPAN');
    for (const variant of ['display-large', 'headline-medium', 'title-small'] as const) {
      await rerender(<Typography variant={variant}>Sample text</Typography>);
      expect(text().tagName, variant).toBe('DIV');
    }
  });

  test('can be a heading, or anything else, through `render`', async () => {
    await render(
      // biome-ignore lint/a11y/useHeadingContent: the content is Typography's children.
      <Typography variant="headline-large" render={<h1 id="top" />}>
        Sample text
      </Typography>,
    );
    await expect
      .element(page.getByRole('heading', { level: 1, name: 'Sample text' }))
      .toBeVisible();
    expect(text()).toHaveAttribute('id', 'top');
    // The style still applies to what it was rendered as.
    expect(style(text()).fontSize).toBe('32px');
    expect(text()).toHaveAttribute('data-variant', 'headline-large');
  });

  test('a render function gets the props', async () => {
    await render(
      // biome-ignore lint/a11y/noLabelWithoutControl: only the element and its `for` attribute are under test.
      <Typography render={(props) => <label {...(props as object)} htmlFor="field" />}>
        Sample text
      </Typography>,
    );
    expect(text().tagName).toBe('LABEL');
    expect(text()).toHaveAttribute('for', 'field');
  });
});

test('takes the colour it is in, and has no margin of its own', async () => {
  await render(
    <div style={{ color: 'rgb(12, 34, 56)' }}>
      <Typography>Sample text</Typography>
    </div>,
  );
  expect(style(text()).color).toBe('rgb(12, 34, 56)');
  expect(style(text()).marginTop).toBe('0px');
  expect(style(text()).marginBottom).toBe('0px');
});

test('forwards a ref, a class, a style and props to its element', async () => {
  let node: HTMLElement | null = null;
  await render(
    <Typography
      className="mine"
      style={{ textTransform: 'uppercase' }}
      data-testid="text"
      ref={(el) => {
        node = el;
      }}
    >
      Sample text
    </Typography>,
  );
  expect(node).toBe(text());
  expect(text()).toHaveClass('mine');
  expect(style(text()).textTransform).toBe('uppercase');
  expect(text().getAttribute('data-testid')).toBe('text');
});

test('follows the theme: overriding a token changes the style', async () => {
  await render(
    <div style={{ ['--md-sys-typescale-body-medium' as string]: '700 2rem/3rem sans-serif' }}>
      <Typography>Sample text</Typography>
    </div>,
  );
  expect(style(text()).fontSize).toBe('32px');
  expect(style(text()).fontWeight).toBe('700');
});
