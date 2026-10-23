# @wisp-ui/react

Material Design 3 **Expressive** components for React: zero-runtime CSS,
tree-shakeable, no shadow DOM.

```bash
pnpm add @wisp-ui/react
```

```tsx
import '@wisp-ui/react/theme.css';
import { Button } from '@wisp-ui/react/button';

export const Save = () => <Button>Save</Button>;
```

Import a component and you get **only that component's CSS**. Everything lives in the
`wisp` cascade layer, so your styles always win.

## Components

`Badge`, `Banner`, `BottomAppBar`, `Button`, `ButtonGroup`, `Card`, `Checkbox`, `Chip`,
`Dialog`, `Divider`, `Fab`, `FabMenu`, `IconButton`, `List`, `LoadingIndicator`, `Menu`,
`NavigationBar`, `NavigationDrawer`, `NavigationRail`, `Progress` (linear and circular),
`Radio`, `Search`, `SearchBar`, `SegmentedButton`, `Sheet`, `Slider` (and `RangeSlider`),
`Snackbar`, `SplitButton`, `Switch`, `Tabs`, `TextField`, `Toolbar`, `Tooltip` and
`TopAppBar`.
More are being ported; see the [status](https://github.com/r007/wisp-ui/blob/main/docs/COMPONENTS.md).

## Theming

```ts
import { applyTheme } from '@wisp-ui/react/theme';

applyTheme(document.documentElement, '#006a60', { variant: 'expressive' });
```

Dark mode follows CSS `color-scheme`. Opt in to calmer motion with
`data-wisp-motion="standard"`, and higher contrast with `data-wisp-contrast="high"` (a system
set to `prefers-contrast: more` gets it by itself, unless the attribute is set on `<html>`).
Override any component through its Material token, e.g.
`--md-comp-button-filled-container-color`.

Requires React 19 and a browser from 2024 or later (cascade layers, `color-mix()`,
`light-dark()`, `linear()`).

See the [repository](https://github.com/r007/wisp-ui) for documentation. Apache-2.0.
Not affiliated with Google; Material Design is a trademark of Google LLC.
