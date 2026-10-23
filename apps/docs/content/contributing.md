---

title: Contributing
description: Set the project up, run the checks, and add a component.
section: Project
order: 30
---

Wisp is open source and pre-release, which makes now a good time to shape it. Try a component in a real layout, test it with a keyboard, and tell us what feels good and what gets in the way.

## Report something

[Open an issue](https://github.com/r007/wisp-ui/issues) for a bug, a rough edge or a component you need. The more of the situation you can describe, the better: the browser, what you did and what you expected.

## Set up

You need Node 22.18 or newer and [pnpm](https://pnpm.io/) 12.

```bash
git clone https://github.com/r007/wisp-ui.git
cd wisp-ui
pnpm install
pnpm storybook
```

Storybook opens at <http://localhost:6006/> and runs from source. To work on this documentation site:

```bash
pnpm --filter @wisp-ui/docs dev
```

## Check your work

```bash
pnpm lint
pnpm typecheck
pnpm test        # in a real browser; install Chromium first
pnpm test:dark   # every story's accessibility checks, in dark mode
pnpm build
```

Install a browser for the tests with `pnpm --filter @wisp-ui/react exec playwright install chromium`. To run on all three engines, add Firefox and WebKit and set `WISP_BROWSERS=chromium,firefox,webkit`.

## Add a component

The repository's [porting guide](https://github.com/r007/wisp-ui/blob/main/docs/porting-guide.md) is the step-by-step procedure: study the design source, write the token spec, write the CSS, write the component, then the stories and tests. Pick the closest existing component of the same kind, and follow it.

Every change that affects a published package needs a **changeset**, which says what changed and how big a change it is. The notes become the [changelog](/docs/changelog/):

```bash
pnpm changeset
```

## Conduct

Be kind. The [code of conduct](https://github.com/r007/wisp-ui/blob/main/CODE_OF_CONDUCT.md) says how.
