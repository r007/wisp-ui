# 0003: Express Expressive's spring motion as CSS `linear()`

Status: accepted

## Context

Material 3 Expressive replaces cubic-bezier motion with **springs** (stiffness and
damping ratio), in two sets: Standard (damping 0.9) and Expressive (0.8 / 0.6,
bouncier). Spatial springs (position, size, shape) overshoot; effects springs
(colour, opacity) do not. CSS has no spring timing function, and a JS animation
library would add a runtime dependency and run animation off the CSS timeline.

## Decision

Solve the damped harmonic oscillator analytically **at build time** and emit a CSS
`linear()` easing with a computed duration, e.g.

```css
--md-sys-motion-spring-fast-spatial: 344ms linear(0, 0.006 1.2%, …, 1);
```

used as `transition: border-radius var(--md-sys-motion-spring-fast-spatial)`. The
curve is simplified (Ramer–Douglas–Peucker, ≤0.002 error) to a few dozen points, and
tests compare it to the exact solution. Springs are system tokens, so the active set
is a theme choice: Expressive by default, `[data-wisp-motion='standard']` to opt out.

## Consequences

- No JavaScript, no runtime, and the motion respects `prefers-reduced-motion`.
- Interruptible-by-retargeting behaviour of a real spring is approximated by CSS
  transitions restarting from the current value. Acceptable for UI of this scale.
- **Overshoot is a hazard where a surface is anchored to a screen edge** (a full-height
  drawer would pull away and expose a gap), so those use a non-overshooting effects
  spring. Decide per component.
- `linear()` needs a 2023+ browser.
