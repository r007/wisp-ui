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

## Documentation site (GitHub Pages)

The site is `apps/docs` (Vite and React, built with the library's own components), with
Storybook under `/storybook/`. The _Documentation_ workflow builds both and deploys them
on every push to `main`, and from Actions → Documentation → Run workflow.

One-time setup:
1. Pages needs a public repository (or a plan with private Pages).
2. Settings → Pages → Source: **GitHub Actions**. (`gh api -X POST repos/<owner>/wisp-ui/pages -f build_type=workflow` does the same.)

The site is served from `https://<owner>.github.io/wisp-ui/`. For another base path or a
custom domain, set `DOCS_BASE` (and `DOCS_SITE`, for canonical links) in the workflow.
Locally: `pnpm --filter @wisp-ui/docs dev`. The component pages are generated from the
components' own doc comments and stories (`apps/docs/scripts/extract.ts`), so keep a
`/** … */` comment, with a ```tsx example, on every exported component.

## Release to npm

1. Create the `wisp-ui` organisation on npm (the packages are `@wisp-ui/react` and
   `@wisp-ui/tokens`). If the scope is unavailable, rename the packages; the name
   appears in `package.json` files, docs and the changeset config.
2. Version: `pnpm changeset version` (consumes the changesets, bumps the packages and
   writes their changelogs), review, commit and tag (`git tag v0.1.0`).
3. Publish: `pnpm release` builds and runs `changeset publish`. Publishing needs an npm
   login, or a token that may publish (set `NODE_AUTH_TOKEN`).
4. Day to day, the release workflow can do 2 and 3 from CI instead: add an npm automation
   token as the repository secret `NPM_TOKEN`; Settings → Actions → General → **Allow
   GitHub Actions to create and approve pull requests** (it opens a "Version packages" PR);
   then add the `push` trigger shown in `.github/workflows/release.yml`. Contributors add a
   changeset (`pnpm changeset`) with their change; merging the "Version packages" PR
   publishes.

## Dependabot

`.github/dependabot.yml` keeps npm dependencies and GitHub Actions current. Expect a
burst of pull requests on the first run. Review the CI result on each; the three
tooling versions most likely to matter are Node (CI uses 24), pnpm (pinned by
`packageManager` in `package.json`) and Playwright.

## Keeping tokens current

See "Updating tokens from upstream" in [porting-guide.md](porting-guide.md).
