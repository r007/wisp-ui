# Wisp

**Material Design 3 Expressive for the modern web.**
Lightweight React components, zero-runtime CSS, no shadow DOM.

> **Status: pre-alpha.** The architecture is settled and a first set of components
> is ported (see [what's done](docs/COMPONENTS.md)). The API will change before 1.0.

## Why

Material Design on the web has been hard to adopt for a few reasons. Wisp is built
around fixing them:

|                  | Typical situation                                                               | Wisp                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **CSS you ship** | One global stylesheet (or all component styles) even if you use a single button | Every component owns its CSS. Import `Button` and you get **only** Button's styles (~2.6 kB gzipped), verified in CI |
| **Shadow DOM**   | Web components isolate styling, hindering theming and SSR                       | Plain React and plain CSS: style it with your own classes, no `::part()`                                             |
| **Coverage**     | Navigation bar, drawer, … missing                                               | Ported from Flutter's Material library, which has the full set                                                       |
| **Expressive**   | Not available                                                                   | Tokens, spring motion and shape morphing from **Material 3 Expressive**                                              |
| **Runtime cost** | CSS-in-JS injects styles at runtime                                             | Static CSS, no runtime, no provider, SSR-safe                                                                        |

## Use it

```bash
pnpm add @wisp-ui/react
```

```tsx
import '@wisp-ui/react/theme.css'; // system tokens: once, at the app root
import { Button } from '@wisp-ui/react/button'; // or: import { Button } from '@wisp-ui/react'

export function Save() {
  return <Button variant="filled">Save</Button>;
}
```

Requires React 19. Components are ESM and work in client and server components
(`"use client"` is preserved where needed).

### Theme it

Colour follows the CSS `color-scheme`, so dark mode is automatic. Switch any
subtree by setting it:

```css
.reading-pane {
  color-scheme: dark;
}
```

Generate a full palette from a seed colour (Material You):

```ts
import { applyTheme } from '@wisp-ui/react/theme';

applyTheme(document.documentElement, '#006a60', { variant: 'expressive' });
```

Override a single component through its Material token, on any ancestor:

```css
.checkout {
  --md-comp-button-filled-container-color: var(--md-sys-color-tertiary);
}
```

Other switches are plain attributes: `data-wisp-motion="standard"` for the calmer
spring set, and `data-wisp-contrast="medium" | "high"` for higher-contrast colour.

### Playing nicely with your CSS

Wisp's CSS lives in a cascade layer called `wisp`, so **your styles always win**
without specificity fights. If your app has a global reset, put it in an earlier
layer so it cannot override components:

```css
@layer reset, wisp;
@layer reset {
  button {
    font: inherit;
  }
}
```

## What's in this repository

```
packages/
  tokens/   @wisp-ui/tokens  Material 3 Expressive tokens as CSS variables + dynamic colour
  react/    @wisp-ui/react   The components (and the Storybook that documents them)
tools/
  codegen/  Imports Material's token data and generates CSS from it. Never published
docs/       Architecture, porting guide, component status, decisions (ADRs)
```

The design values are not hand-copied: they are imported from Flutter's Material
library (token release 38.2.83, which includes Expressive) and compiled to CSS.
Read [docs/architecture.md](docs/architecture.md) for how, and
[docs/porting-guide.md](docs/porting-guide.md) to port the next component.

## Develop

Requires Node ≥ 22.18 and pnpm ≥ 12 (Node 26 no longer ships Corepack, so
`npm i -g pnpm@latest`).

```bash
pnpm install
pnpm storybook          # component explorer with light/dark, seed colour, motion, contrast
pnpm test               # real-browser tests (Vitest + Playwright) and story tests
pnpm lint               # Biome + Stylelint
pnpm typecheck
pnpm build              # packages, then: pnpm --filter @wisp-ui/react check:treeshake
```

Browser tests need Chromium: `pnpm --filter @wisp-ui/react exec playwright install chromium`.
If your home disk is tight, point it elsewhere with `PLAYWRIGHT_BROWSERS_PATH`.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[Apache-2.0](LICENSE). Material token data is derived from Flutter (BSD-3-Clause)
and parts of the ripple and elevation logic from Material Web (Apache-2.0); see
[NOTICE](NOTICE) and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

Wisp is an independent project, not affiliated with or endorsed by Google.
Material Design is a trademark of Google LLC.
