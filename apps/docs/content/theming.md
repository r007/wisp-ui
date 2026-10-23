---

title: Theming
description: One seed colour becomes a whole palette. Tokens, contrast levels, and overriding a single component.
section: Foundations
order: 10
---

A theme is a set of CSS custom properties, called system tokens: colours, type, shape, elevation, state and motion. Components read them, so changing a token changes every component that uses it.

## The baseline

`theme.css` carries a baseline palette, ready to use. Everything below is optional.

## A palette from one colour

Give `applyTheme` a seed colour and it generates every colour role, in light and dark, and sets them on an element:

```ts
import { applyTheme } from '@wisp-ui/react/theme';

const remove = applyTheme(document.documentElement, '#006a60');

// Later, to take the palette off again:
remove();
```

The seed is a hex colour. The result is a complete, accessible palette: surfaces, containers, outlines, and a primary, secondary and tertiary colour with their "on" pairs. Pick a seed with the picker in this site's header to see one at work.

### Options

```ts
applyTheme(document.documentElement, '#006a60', {
  variant: 'expressive',
  contrast: 0.5,
});
```

| Option        | Values                                                                                                          | Default      |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| `variant`     | `tonal-spot`, `vibrant`, `expressive`, `neutral`, `monochrome`, `fidelity`, `content`, `rainbow`, `fruit-salad` | `tonal-spot` |
| `contrast`    | -1 (reduced) to 1 (high). 0 is standard and 0.5 is medium.                                                      | `0`          |
| `specVersion` | `'2021'` or `'2025'`: which revision of the colour algorithm                                                    | `'2025'`     |

The variant decides how the seed is spread across the palette: `tonal-spot` is calm and the usual choice, `vibrant` and `expressive` are livelier, `monochrome` is greys, and `fidelity` and `content` stay closest to the seed itself.

### Scoping a theme

`applyTheme` works on any element, so one part of a page can have its own palette:

```ts
applyTheme(document.querySelector('.checkout')!, '#9c4146');
```

## Server rendering and static CSS

`applyTheme` needs a DOM. To produce the same theme as a stylesheet, for example to render it on the server or write it to a file, use `createThemeCss`:

```ts
import { createThemeCss } from '@wisp-ui/tokens';

const css = createThemeCss('#006a60', { variant: 'expressive' }, ':root');
// :root { --md-sys-color-primary: light-dark(#…, #…); … }
```

The rule it writes is not in a cascade layer, so it wins over the baseline without any specificity games. `createThemeProperties(seed, options)` returns the same thing as an object.

> [!TIP]
> To avoid a flash of the default colours, generate the CSS at build time and include it in the page, as this site does for its six preset colours.

## Overriding one role

Set any system token on any element. Everything inside it follows:

```css
:root {
  --md-sys-color-primary: #7a3e9d;
}

.promo {
  --md-sys-color-surface-container: light-dark(#fff3cd, #3a2f00);
}
```

The colour roles are listed in `COLOR_ROLES`, exported from `@wisp-ui/tokens`. The other families are `--md-sys-typescale-*` (each a `font` shorthand, with a `-tracking` companion), `--md-sys-shape-corner-*`, `--md-sys-state-*` and `--md-sys-motion-*`.

## Overriding one component

Each component reads its own tokens, which you can set on any ancestor. The name says which component and which part, and the value falls back to the system:

```css
.checkout {
  --md-comp-button-filled-container-color: var(--md-sys-color-tertiary);
}
```

Only the tokens a component uses exist. To see them, look in the component's folder in the repository, in its `*.tokens.generated.module.css`: each line sets a private variable from the public token that overrides it.

## Contrast

The baseline has three contrast levels. Set an attribute on the page, or on any element:

```html
<html data-wisp-contrast="high"></html>
```

`medium` and `high` are available. When the visitor's system asks for more contrast (`prefers-contrast: more`) the baseline switches to high automatically, unless you set the attribute yourself. A seed palette bakes contrast in instead, through the `contrast` option above.

## Type

The type scale is the five roles, display, headline, title, body and label, each in three sizes. Each style is a single `font` shorthand token, with its letter spacing beside it:

```css
.heading {
  font: var(--md-sys-typescale-headline-medium);
  letter-spacing: var(--md-sys-typescale-headline-medium-tracking);
}
```

The `Typography` component does exactly that, as an element, and has an emphasised version of each style. The faces come from `--md-ref-typeface-brand` and `--md-ref-typeface-plain`; see [getting started](/docs/getting-started/#fonts-and-icons-are-yours).
