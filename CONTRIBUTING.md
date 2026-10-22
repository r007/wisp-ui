# Contributing

Thanks for helping. The fastest way to be useful is to **port a component**: the
process is documented and mostly mechanical. See
[docs/porting-guide.md](docs/porting-guide.md) and pick something from
[docs/COMPONENTS.md](docs/COMPONENTS.md).

## Setup

Node ≥ 22.18 and pnpm ≥ 12 (`npm i -g pnpm@latest`; Node 26 no longer ships Corepack).

```bash
pnpm install
pnpm --filter @wisp-ui/react exec playwright install chromium   # for the browser tests
pnpm storybook
```

If your home directory is short on space, set `PLAYWRIGHT_BROWSERS_PATH` to somewhere
roomy before installing and running tests.

## Before you open a pull request

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @wisp-ui/react check:treeshake
pnpm --filter @wisp-ui/react check:types
pnpm check:packages
```

CI runs the same. Also:
- **Look at your component** in Storybook: light and dark, a non-baseline seed
  colour, both motion schemes, higher contrast.
- **Add a changeset** (`pnpm changeset`) for anything that changes a published package.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat(react): …`, `fix(tokens): …`, `docs: …`).

## Ground rules

These are enforced by tooling where possible, and are what review looks for:
- **No literal colours, sizes or timings in hand-written CSS.** Values come from
  tokens; add the token to the component's `*.tokens.ts` spec.
- **Never hand-edit `*.generated.*` files.** Change the spec or the emitter and run
  `pnpm codegen generate`.
- **Accessibility is not optional.** Name controls, use native elements, support the
  keyboard, and keep the axe checks green.
- **Test in the browser, against the spec.** Assert real geometry and computed
  styles, not just that something rendered.
- **Keep CSS per component.** `check:treeshake` fails if a component pulls in
  another's styles or exceeds its size budget.
- Published packages import siblings as `./thing.js`; Node-run tooling in `tools/`
  imports `.ts`. (See `tsconfig.base.json` for why.)

## Reporting bugs and requesting components

Use the issue templates. For a visual problem, a screenshot beside Flutter's or the
Material spec's rendering helps a lot. For security issues see [SECURITY.md](SECURITY.md).

## Licence

By contributing you agree your work is licensed under Apache-2.0 (see [LICENSE](LICENSE)).
If you adapt code from another project, say where from in the file header and add it
to [NOTICE](NOTICE).
