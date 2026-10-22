# 0002: Generate CSS from Flutter's Expressive token data

Status: accepted

## Context

Material publishes its design values as tokens (thousands: the Button alone has
~360). Hand-copying them is error-prone and goes stale. Flutter's Material library
is the most complete implementation (it has the full component set) and its tokens
are machine-readable.

There are two copies. The Flutter SDK's `packages/flutter/lib/src/material` is
**frozen** at Material 3 without Expressive (JSON data, release 6.1.0). The live
copy is the standalone `material_ui` package in `flutter/packages` (Dart data,
release 38.2.83), which includes Expressive. A long-lived `m3e_migration` branch
exists, but it is a tooling branch, 919 commits behind `main`, with older tokens
(38.2.6).

## Decision

Import the token data from **`flutter/packages` `main`** (`material_ui`), parse
the Dart into a normalised JSON database committed to the repo, and generate CSS
from it. Record the source commit and token release in the JSON.

## Consequences

- The importer is **strict**: an unrecognised value shape throws, and a per-file
  count check fails if a documented token is not parsed. Silently dropping a token
  would produce a subtly wrong component.
- Scheme-dependent tokens (light/dark/contrast colour, Standard/Expressive
  springs) are modelled separately because they reuse names.
- Component specs assert that tokens the CSS treats as equal really are equal, so an
  upstream change cannot invalidate a simplification unnoticed.
- Updating is a small, reviewable diff (see the porting guide).
- We depend on the shape of Flutter's generated Dart. If it changes, the importer
  fails loudly and is a small file to adapt.
- Flutter's _widgets_ sometimes lag its _tokens_ (the navigation bar widget still
  uses classic constants). Where that happens we take the tokens and design the
  behaviour, and say so in the component.
