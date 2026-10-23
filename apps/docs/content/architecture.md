---

title: How it is built
description: Design values are data and components are thin. The token pipeline, per-component CSS, and the decisions behind them.
section: Guides
order: 22
---

Wisp has one idea at its core: **design values are data, and components are thin.** Colours, sizes, shapes and motion are imported as tokens and compiled to CSS. The code written by hand only describes structure and behaviour.

```text
token data  ──►  codegen (build time)  ──►  theme.css            system tokens
                                       └─►  *.tokens.generated   each component's tokens
                                                   │
component.tsx + component.module.css  ◄───────────┘   structure and behaviour only
```

## Tokens

The token data is a set of named values: a colour role, a corner size, a spring's stiffness and damping. A build-time tool, which is never published, reads the upstream data into one committed JSON file and checks it strictly. It stops on a value it does not understand, rather than skipping it, and checks a count to be sure none was lost. The file is one token per line, so an upstream update is a readable diff.

From that file the tool writes the **system tokens** (`theme.css`: colour roles as `light-dark()` pairs, the type scale, shape, elevation, state and motion) and, for each component, a stylesheet of the tokens it uses.

## Per-component token specs

A small spec says which tokens feed which private variable of a component:

```ts
{
  selector: '.filled',
  prefix: 'md.comp.button.filled',
  vars: {
    'container-color': 'container.color',
    // An array asserts that every token has the same value.
    'label-color': ['label-text.color', 'hovered.label-text.color', 'pressed.label-text.color'],
  },
}
```

That produces:

```css
.filled {
  --_container-color: var(--md-comp-button-filled-container-color, var(--md-sys-color-primary));
}
```

The first `var()` is the **public override**, the token's own name, which you can set on any ancestor. The fallback is the default, written in system tokens, so theming, dark mode and contrast still flow through. And an array is a **generation-time check**: the hand-written CSS can use one label colour for rest, hover and press, and if an upstream update ever made those tokens differ, generation fails and says which, instead of the component being quietly wrong.

Only the tokens a component uses are emitted. The whole Button, with five variants, five sizes and a toggle, is about 1.6 kB of token CSS gzipped, out of the roughly 360 tokens published for it.

## Components

Each component is a folder: the component, a stylesheet that is structure only (never a literal colour, size or timing), the token spec, its stories and its tests. Shared parts live in a `foundation` folder: the pressable behaviour, the state layer and ripple, the focus ring, the `render` prop, controlled state, and hooks for menus and popovers.

## Decisions

**CSS Modules and modern CSS, not CSS-in-JS.** There is no runtime, no provider, the CSS is per component, and it is plain CSS that a reader can follow. The browser features doing the work are `@layer`, custom properties, `light-dark()`, `color-mix()`, `:has()`, `@starting-style` and `linear()`.

**Cascade layers.** All library CSS is in `@layer wisp`, so unlayered consumer CSS always wins.

**Springs without script.** The generator solves each spring analytically and writes it as a CSS `linear()` easing, used like any `transition`. Spatial springs overshoot; effects springs do not. Standard and expressive motion is one attribute.

**Platform first.** `<dialog>` for modals, a real checkbox for the switch, popovers for menus. It is less code, it is more accessible, and it works with forms. A headless library is considered only where the platform falls short.

**Per-component CSS in the build.** Each module emits its own `.css`, imported by its own JavaScript, so a bundler that tree-shakes ships only the styles of what you imported. A check builds a throwaway app for every component, through both import styles, and fails on another component's styles or on a size over budget.

## Tested in a real browser

The tests run in real browsers, not a simulated DOM, because the components depend on layout, computed style, native dialogs and popovers. They assert on what people get: roles and names, keyboard behaviour, and geometry and computed colours from the spec.

The repository's [architecture notes](https://github.com/r007/wisp-ui/blob/main/docs/architecture.md) and decision records go further.
