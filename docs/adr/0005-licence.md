# 0005: Apache-2.0, and the name

Status: accepted

## Licence

**Apache-2.0.** The project adapts code from Material Web (Apache-2.0: the ripple
state machine and elevation curves) and includes data derived from Flutter's
`material_ui` (BSD-3-Clause). Using Apache-2.0 for the whole repository keeps one
clear licence, preserves both upstreams' notices (`NOTICE`,
`THIRD_PARTY_LICENSES.md`), and adds an explicit patent grant, which matters for a
library derived from a major vendor's design system. MIT would have meant carrying
Apache-licensed fragments inside an MIT repository.

Files with substantial adapted code carry a header saying where from and what changed.

## Name

**Wisp**: "a thin, delicate trace", fitting a deliberately lightweight library. It
avoids borrowing a trademarked term as a brand, and the public documentation
describes the library by what it is and does. Where the work of others is used, the
credits page, `NOTICE` and `THIRD_PARTY_LICENSES.md` say so, as the licences require.
Checked for collisions on npm and GitHub (no established project).

## Consequences

- The credits page and `NOTICE` state that the project is independent of the projects it credits.
- If the name changes, it appears in package names, the `wisp` cascade layer, CSS
  class prefixes, and `data-wisp-*` attributes; a repository-wide rename covers it.
