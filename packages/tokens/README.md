# @wisp-ui/tokens

Material Design 3 **Expressive** design tokens as CSS custom properties, plus a
dynamic-colour theme generator. No framework required.

```ts
import '@wisp-ui/tokens/theme.css';
```

`theme.css` defines the system tokens: colour roles (`--md-sys-color-*`, using
`light-dark()` so they follow `color-scheme`), the type scale, shape, elevation, state
and motion (including **spring** easings compiled to CSS `linear()`). Token names are
Material's own with dots turned into hyphens, so they match the Material specification
and Material Theme Builder exports.

```ts
import { applyTheme, createThemeCss } from '@wisp-ui/tokens';

applyTheme(document.documentElement, '#006a60', { variant: 'expressive', contrast: 0.5 });
const css = createThemeCss('#6750a4', {}, '.brand'); // a rule you can inject
```

The values come from Flutter's Material library (token release 38.2.83) and are
generated, not hand-copied. See the [repository](https://github.com/r007/wisp-ui).
Apache-2.0.
