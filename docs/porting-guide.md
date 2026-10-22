# Porting a component

This is the procedure used for the components already ported. Follow it and a new
component is mostly mechanical: the tokens are data, the foundation exists, and the
tests tell you quickly when something is wrong.

Pick the next component from [COMPONENTS.md](COMPONENTS.md). Look at an existing
component of the same _archetype_ first:

| Archetype                   | Start from                              | Why                                                       |
| --------------------------- | --------------------------------------- | --------------------------------------------------------- |
| A pressable control         | `button/`, `icon-button/`               | `usePressable`, state layer, shape morph                  |
| A native form control       | `switch/`                               | a real `<input>` driving everything via sibling selectors |
| A composite of destinations | `navigation-bar/`, `navigation-drawer/` | context, `aria-current`, indicator                        |
| An overlay                  | `navigation-drawer/` (modal)            | native `<dialog>`, `@starting-style`                      |

## 1. Study the source

```bash
# What tokens exist? (names relative to the prefix, values compacted)
pnpm codegen tokens md.comp.chips.filter

# How does Flutter build it? (reference checkout, next to this repo)
../flutter-packages/packages/material_ui/lib/src/chip.dart
```

Read the Flutter widget for **behaviour** (states, semantics, edge cases) and the
tokens for **values**. Flutter's widget can lag the tokens: the navigation bar's
widget still uses classic M3 constants while the Expressive `nav-bar` tokens are
published, so the port took the tokens and designed the motion itself. Note such
cases in the component's comments.

Also look at the Material Web implementation (`../material-web/<component>`) for
how an accessible DOM structure maps onto the web.

## 2. Write the token spec

`src/<component>/<component>.tokens.ts`, default-exporting a `ComponentTokenSpec`.
Map each token the CSS needs to a private variable:

```ts
import { type ComponentTokenSpec, sameInEveryState, stateLayerColor } from '@wisp-ui/codegen/spec';

export default {
  name: 'Chip',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.chips',
      vars: {
        /* shared */
      },
    },
    {
      selector: '.filter',
      prefix: 'md.comp.filter-chip',
      vars: {
        /* … */
      },
    },
  ],
} satisfies ComponentTokenSpec;
```

Guidance:
- **Group tokens that must be equal** in an array (`sameInEveryState('label-text.color')`
  for rest/hover/focus/press). Generation fails with both token names if upstream
  ever changes one. This turns "I assumed these were the same" into a checked fact.
- **Not every token needs mapping.** Skip what you will not use, and say why in a
  comment when it is a deliberate omission (e.g. the nav bar's elevation).
- **Selected vs unselected for native inputs** (checkbox, switch, radio): the DOM
  holds the state, so use distinct variable names (`selected-track-color`) and let
  CSS pick with `:checked`, rather than per-state classes.
- **Springs:** map the stiffness/damping pair as an array; it collapses into the
  system spring variable.
- **Shapes that animate:** set `circularRadius: 'calc(var(--_container-height) / 2)'`
  so "fully rounded" has a real value to interpolate from.

Then:

```bash
pnpm codegen generate
```

The error messages are specific: they name the unknown token and list its
neighbours, or the two tokens that disagreed. Fix the spec until it passes.

## 3. Write the CSS

`<component>.module.css`: **structure and behaviour only.**
- Wrap everything in `@layer wisp { … }`.
- Read only `--_*` variables and `--md-sys-*` tokens. No hex, no `rgb()`, no named
  colours (Stylelint rejects them), no `ms` literals in `transition`.
- Compose state from the DOM (`:disabled`, `[aria-current]`, `:checked`,
  `:focus-visible`) and from `data-*` attributes the component sets.
- Animate with the spring variables: spatial for position/size/shape, effects for
  colour/opacity. Avoid _overshooting_ springs on anything anchored to a screen edge.
- Add `prefers-reduced-motion` (drop transitions) and `forced-colors` (restore a
  visible boundary) blocks.

## 4. Write the component

`<component>.tsx`. Start `'use client'` if it uses hooks or state. Typical shape:

```tsx
const pressable = usePressable({ href, disabled, selected, onSelectedChange, onClick, ref, type });
return renderElement(pressable.tag, { ...rest, ...pressable.props, className: cx(…), children: … }, render);
```

Checklist:
- **Name every control.** Icon-only → require `aria-label`. Landmark → require a name.
- **Prefer native elements** and let them provide semantics.
- **Support `render`** for anything that can be a link, so routers work.
- **Accept `className`, `style` and DOM props**, pass them through, and let consumers win.
- **Expose hooks**, not hashed class names: `data-variant`, `data-selected`, `data-slot`.
- **Hide decorative content** from assistive technology; announce meaningful content
  _after_ the label so the accessible name reads naturally.
- Export it from the folder's `index.ts` and from `src/index.ts`. The build finds each
  component's entry point (`@wisp-ui/react/<folder>`) from folders that have an `index.ts`.

## 5. Stories and tests

`<component>.stories.tsx` documents it (every variant, state and size) and runs as a
test with an **axe accessibility check set to fail**.

`<component>.test.tsx` runs in real Chromium. Assert on what users get:
- semantics: roles, names, `aria-*`
- behaviour: click, keyboard, controlled/uncontrolled, disabled
- **geometry and computed style from the spec**, e.g. "the small button is 40px with
  a 20px radius", "the selected indicator is `secondary-container`"
- animated properties via `expect.poll`, since springs take a few hundred ms
- RTL, focus ring, hover state layer, press ripple, hit target

Pitfalls found the hard way:
- A hashed class name is not a selector; add a `data-slot` instead.
- Storybook's `userEvent` fires _synthetic_ events: they do not trigger native
  behaviours such as a `<dialog>`'s Escape. Test those with Vitest's `userEvent`.
- `getComputedStyle` may serialise `color-mix()` as `color(srgb …)`; match values,
  not strings.
- `page.getByRole('link')` excludes an `<a>` with no `href`; a disabled link needs
  `role="link"` restored.

## 6. Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @wisp-ui/react check:treeshake   # only this component's CSS ships; under budget
pnpm --filter @wisp-ui/react check:types       # published types resolve for consumers
```

Then **look at it**: run `pnpm storybook`, check light/dark, a non-baseline seed
colour, Standard vs Expressive motion, and higher contrast. Compare against the
Material spec and Flutter's rendering.

## 7. Record it

- Update the status in [COMPONENTS.md](COMPONENTS.md).
- Add a changeset: `pnpm changeset`.
- If you made a decision a future reader would question, add an ADR in `docs/adr/`.

## Updating tokens from upstream

When Material publishes new tokens (Flutter's `material_ui` package tracks them):

```bash
git -C ../flutter-packages pull
pnpm codegen import --source ../flutter-packages/packages/material_ui/tool/gen_defaults/data
pnpm codegen generate
git diff tools/codegen/data/tokens.json   # one token per line: review what changed
pnpm test                                  # invariants fail loudly where a component's assumptions broke
```

The importer refuses values it does not understand, so a new shape of token shows up
as an error to handle rather than something silently dropped.

`../flutter-packages` is a sparse checkout of <https://github.com/flutter/packages>
(`packages/material_ui`). The standalone `material_ui` package is where Flutter's
Material library now evolves; the copy inside the main `flutter/flutter` repository
is frozen at Material 3 without Expressive.
