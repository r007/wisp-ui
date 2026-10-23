---

title: Browser support
description: Which browsers Wisp runs in, which modern CSS it relies on, and what degrades.
section: Guides
order: 21
---

Wisp is written for current browsers, and makes use of what they now offer instead of working around what older ones did not.

## Supported

The current versions of **Chrome, Edge, Firefox and Safari**, and the browsers built on their engines. The test suite runs the same checks in Chromium, Firefox and WebKit.

## What it relies on

| Feature                           | Used for                                               |
| --------------------------------- | ------------------------------------------------------ |
| Cascade layers (`@layer`)         | All library CSS is in the `wisp` layer, so yours wins. |
| `light-dark()` and `color-scheme` | Every colour, which is how dark mode is one property.  |
| `color-mix()`                     | State layers, such as the tint on hover.               |
| `:has()`                          | Styling a component by what it contains.               |
| The `popover` attribute           | Menus, tooltips and snackbars.                         |
| CSS anchor positioning            | Placing a popover against its trigger with no script.  |
| `<dialog>` and `inert`            | Modals, sheets and drawers.                            |
| `@starting-style`                 | Entry animations, so there is no animation script.     |
| `linear()` easing                 | Springs.                                               |
| Logical properties and `:dir()`   | Right-to-left layouts.                                 |

A browser without cascade layers, `light-dark()` or anchor positioning is not supported. There is no fallback build.

## Enhancements

A few things are used only where they exist, and the component still works without them: `interpolate-size`, `corner-shape`, scroll-driven animations and interest invokers. A browser that lacks one gets the same component with a plainer transition.

## Known engine differences

The engines disagree about small things, and Wisp's tests run on all three because the disagreement is usually a real bug in one of them for a user. Things that have been worked around, so you do not meet them, include:
- Firefox hiding a closing `<dialog>` or popover at once, which would cut off its exit animation.
- WebKit scrolling a newly focused element into view after the focus event, which would cancel a scroll started from it.
- Firefox putting a scroll container in the tab order even when it holds focusable items.

If you find a difference between browsers in a component, that is a bug worth reporting.
