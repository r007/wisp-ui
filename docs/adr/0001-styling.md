# 0001: CSS Modules and modern CSS instead of CSS-in-JS

Status: accepted

## Context

The goals are lightweight components, no CSS the app does not use, SSR safety, and
no shadow DOM. Griffel (atomic CSS-in-JS) was the starting suggestion. The options
considered were Griffel, Vanilla Extract, StyleX, and plain CSS Modules.

What the design system needs from styling: per-component CSS, theming through
custom properties (Material is _defined_ in terms of them), state layers and
pseudo-elements, and values that come from generated tokens.

## Decision

Author components in **CSS Modules**, using modern CSS (`@layer`, custom
properties, `light-dark()`, `color-mix()`, `:has()`, `@starting-style`, `linear()`).
Build per-component stylesheets; no runtime.

## Why not the alternatives

- **Griffel / runtime CSS-in-JS.** Atomic CSS pays off when thousands of
  differently-styled elements share declarations; a token-driven component library
  mostly has one rule set per component. A runtime also needs a renderer/provider
  and SSR plumbing, and as far as we could tell (not benchmarked here) getting
  zero-runtime CSS means a build step in each _consumer's_ bundler. That conflicts
  with "import a button, get a button".
- **Vanilla Extract / StyleX.** Zero-runtime and type-safe, but styles are written in
  object syntax, which is clumsy for state layers, pseudo-elements and `@starting-style`,
  and moves reviewers away from reading the CSS the browser runs. Token generation
  already gives us the type-safety that matters (a failing build when a token is wrong).
- **Plain CSS Modules** keep the source as the CSS that ships, work in every
  bundler, and let consumers override with ordinary CSS.

## Consequences

- **Cascade layers.** All library CSS is in `@layer wisp`, so consumer CSS wins
  without specificity fights. Consumers with an _unlayered_ global reset such as
  `button { background: none }` will override components, so the docs tell them to
  put resets in an earlier layer.
- **Hashed class names are not API.** Customisation goes through Material token
  custom properties and `data-*` hooks.
- **Plain `.css` in the published package.** A bare import of an unused CSS
  _Module_ is dropped by consumers' bundlers; plain CSS imports are kept. The build
  therefore emits already-scoped plain CSS (see `vite.lib.config.ts`).
- Class names are not type-checked. Stylelint and the unit tests are the safety net.
- Requires browsers with cascade layers, `color-mix()` and `light-dark()` (all
  evergreen browsers since 2024).
