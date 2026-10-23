# @wisp-ui/tokens

Design tokens as CSS custom properties, plus a dynamic-colour theme generator and light and
dark helpers. No framework required.

**[Documentation](https://r007.github.io/wisp-ui/docs/theming/)**

```ts
import '@wisp-ui/tokens/theme.css';
```

`theme.css` defines the system tokens: colour roles (`--md-sys-color-*`, using
`light-dark()` so they follow `color-scheme`), the type scale, shape, elevation, state
and motion (including **spring** easings compiled to CSS `linear()`). The token names
are the widely used `--md-sys-*` family, so palettes exported from common theme
generators work as they are.

```ts
import { applyTheme, createThemeCss } from '@wisp-ui/tokens';

applyTheme(document.documentElement, '#006a60', { variant: 'expressive', contrast: 0.5 });
const css = createThemeCss('#6750a4', {}, '.brand'); // a rule you can inject
```

## Dark mode

```ts
import {
  applyColorScheme,
  colorSchemeScript,
  readColorScheme,
  storeColorScheme,
} from '@wisp-ui/tokens';

applyColorScheme('dark'); // 'light' | 'dark' | 'system'
storeColorScheme('dark'); // remember it
// colorSchemeScript is a one-line inline <head> script that applies it before first paint.
```

The values are generated from open token data, not hand-copied. See the
[repository](https://github.com/r007/wisp-ui) and the
[credits](https://r007.github.io/wisp-ui/docs/licences/). Apache-2.0.
