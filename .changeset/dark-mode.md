---

'@wisp-ui/react': minor
'@wisp-ui/tokens': minor
---

Dark mode for apps. `@wisp-ui/tokens` adds `applyColorScheme`, `readColorScheme`, `storeColorScheme`, `resolveColorScheme` and `colorSchemeScript` (an inline `<head>` script that applies the remembered choice before the first paint); `@wisp-ui/react/theme` adds the `useColorScheme` hook. Every story's checks now also run in the dark scheme (`pnpm test:dark`).
