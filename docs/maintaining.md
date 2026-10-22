# Maintaining the repository

One-time setup for the things automation cannot do for you. The CI workflow works
out of the box; **Storybook deploy and Release are manual** (`workflow_dispatch`)
until the steps below are done, so a fresh repository does not fail on every push.

## Going public

The repository starts **private**. Before making it public:
- Review `NOTICE` (copyright line) and `LICENSE`.
- Remember commit history shows the author email from your git config. To use
  GitHub's no-reply address instead, set it and rewrite history _before_ going public.
- Then: `gh repo edit r007/wisp-ui --visibility public --accept-visibility-change-consequences`

## Publish Storybook (GitHub Pages)

1. Pages needs a public repository (or a plan with private Pages).
2. Settings → Pages → Source: **GitHub Actions**.
3. Run the _Storybook_ workflow once (Actions → Storybook → Run workflow).
4. To deploy on every push to `main`, add the `push` trigger shown in
   `.github/workflows/storybook.yml`.

## Release to npm

1. Create the `wisp-ui` organisation on npm (the packages are `@wisp-ui/react` and
   `@wisp-ui/tokens`). If the scope is unavailable, rename the packages; the name
   appears in `package.json` files, docs and the changeset config.
2. Add an npm automation token as the repository secret `NPM_TOKEN`.
3. Settings → Actions → General → **Allow GitHub Actions to create and approve pull
   requests** (the release workflow opens a "Version packages" PR).
4. Add the `push` trigger shown in `.github/workflows/release.yml`.

Day to day: contributors add a changeset (`pnpm changeset`); the workflow keeps a
"Version packages" PR up to date; merging it publishes.

## Dependabot

`.github/dependabot.yml` keeps npm dependencies and GitHub Actions current. Expect a
burst of pull requests on the first run. Review the CI result on each; the three
tooling versions most likely to matter are Node (CI uses 24), pnpm (pinned by
`packageManager` in `package.json`) and Playwright.

## Keeping tokens current

See "Updating tokens from upstream" in [porting-guide.md](porting-guide.md).
