---

title: Motion
description: Springs instead of curves, shapes that change as you press, and a calmer set for when it is too much.
section: Foundations
order: 13
---

Motion in Wisp is physical. Things move on springs, so they speed up and settle as real objects do, and controls change shape as they are pressed.

## Springs

There are three springs, each in two kinds:

| Token                                    | For                                                   |
| ---------------------------------------- | ----------------------------------------------------- |
| `--md-sys-motion-spring-fast-spatial`    | Small things moving, resizing or changing shape.      |
| `--md-sys-motion-spring-default-spatial` | Most movement.                                        |
| `--md-sys-motion-spring-slow-spatial`    | Large things, such as a full-width sheet.             |
| `--md-sys-motion-spring-*-effects`       | Colour and opacity: the same springs, without bounce. |

A **spatial** spring may overshoot its target and settle back: that is the bounce. An **effects** spring never does, because a colour cannot go past its destination. Each token is a CSS `transition` value, a duration and a `linear()` easing that solves the spring, so there is no animation script behind it:

```css
.thing {
  transition: border-radius var(--md-sys-motion-spring-fast-spatial);
}
```

## Standard and expressive

By default, springs are expressive: livelier, with visible bounce. Set an attribute on the page, or on any element, for the calmer set:

```html
<html data-wisp-motion="standard"></html>
```

The tokens keep their names, so nothing else changes.

## Reduced motion

Every component respects `prefers-reduced-motion`. Transitions are dropped, and animation that runs in script (the [loading indicator](/components/loading-indicator/), the [shape](/components/shapes/) morph) changes at once, or holds still. You do not need to do anything.

## Duration and easing

For a motion that is not a spring there are duration and easing tokens too: `--md-sys-motion-duration-*` and `--md-sys-motion-easing-*`.

## When script drives it

A few things cannot be done in CSS, and run in script instead, on the same spring:
- **Shape morphing.** An outline between two different shapes has to be computed. See [shapes](/docs/shapes/).
- **The loading indicator**, which morphs through seven shapes.
- **The press ripple**, which grows from where you pressed.

All of them stop for reduced motion, and none cause a React render per frame.
