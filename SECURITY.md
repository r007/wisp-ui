# Security policy

## Supported versions

Wisp is pre-1.0. Only the latest published release receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately
through GitHub's [private vulnerability reporting](https://github.com/r007/wisp-ui/security/advisories/new)
for this repository.

Include what you found, how to reproduce it, and the version affected. You can
expect an acknowledgement within a few days. If the report is confirmed we will
agree a disclosure timeline with you and credit you in the release notes, unless
you prefer otherwise.

## Scope

Wisp ships components and CSS only; it has no server component and makes no
network requests. Relevant reports include, for example, XSS through a component's
props, or a supply-chain problem in the published packages.
