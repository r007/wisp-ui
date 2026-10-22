# 0004: Use native platform features before headless libraries

Status: accepted

## Context

Many design-system libraries build on a headless layer (Radix, React Aria,
Base UI) for accessibility behaviour. That saves work for complex widgets, at the
cost of a dependency and its weight, which conflicts with "lightweight".

## Decision

Use what the platform provides, and write the remaining behaviour ourselves:
- `<dialog>` + `showModal()` for modals: top layer, focus containment, inert page,
  Escape, focus return.
- `<input type="checkbox" role="switch">` for the Switch (forms, labels, keyboard).
- `<nav>` + `<ul>` + `aria-current` for navigation; native `<button>`/`<a>`.
- `:dir(rtl)`, `:focus-visible`, `@starting-style`, discrete transitions.

Adopt a headless library **only where the platform genuinely falls short** (likely
menu/select/combobox keyboard models, date pickers), chosen per component, with its
size and tree-shaking measured against the CSS/JS budget.

## Consequences

- Smaller bundles and fewer dependencies for the components done so far.
- Correct form participation and screen-reader semantics for free.
- More behaviour to own for complex widgets later; revisit when reaching Menu,
  Select and the pickers.
- Where a native behaviour is awkward to test (Escape on a dialog) the test uses
  real browser input, not synthetic events.
