# Changelog

Wisp records its changes per package, written by [Changesets](https://github.com/changesets/changesets)
when a release is versioned: every change that affects a package comes with a note (`pnpm changeset`),
and the notes become the changelog.
- [`@wisp-ui/react`](packages/react/CHANGELOG.md)
- [`@wisp-ui/tokens`](packages/tokens/CHANGELOG.md)
- The same, on the [documentation site](https://r007.github.io/wisp-ui/docs/changelog/)
- Each release is also a [GitHub release](https://github.com/r007/wisp-ui/releases) with its notes

The two packages are versioned together. Wisp follows [semantic versioning](https://semver.org/),
with the usual caveat for versions before 1.0: a minor version may change an API, and its notes
say so when it does. Patch versions only fix things.
