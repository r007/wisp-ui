# @wisp-ui/react

Expressive components for React: zero-runtime CSS, tree-shakeable, no shadow DOM.
Native elements, shapes that morph, dynamic colour and dark mode.

**[Documentation](https://r007.github.io/wisp-ui/)** ·
[Components](https://r007.github.io/wisp-ui/components/) ·
[Storybook](https://r007.github.io/wisp-ui/storybook/)

```bash
npm install @wisp-ui/react
```

```tsx
import '@wisp-ui/react/theme.css';
import { Button } from '@wisp-ui/react/button';

export const Save = () => <Button>Save</Button>;
```

Import a component and you get **only that component's CSS**. Everything lives in the
`wisp` cascade layer, so your styles always win.

## Components

`Accordion`, `Autocomplete`, `Badge`, `Banner`, `BottomAppBar`, `Button`, `ButtonGroup`,
`Card`, `Carousel`, `Checkbox`, `Chip`, `DatePicker` (and range, and dialogs), `Dialog`,
`Divider`, `Fab`, `FabMenu`, `IconButton`, `List`, `LoadingIndicator`, `Menu`,
`NavigationBar`, `NavigationDrawer`, `NavigationRail`, `Progress` (linear and circular),
`Radio`, `Search`, `SearchBar`, `SegmentedButton`, `Select`, `Shape`, `Sheet`, `Slider`
(and `RangeSlider`), `Snackbar`, `SplitButton`, `Switch`, `Tabs`, `TextField`,
`TimePicker`, `Toolbar`, `Tooltip`, `TopAppBar` and `Typography`. Each has live examples
and its full API in the [documentation](https://r007.github.io/wisp-ui/components/).

## Theming and dark mode

```ts
import { applyTheme } from '@wisp-ui/react/theme';

applyTheme(document.documentElement, '#006a60', { variant: 'expressive' });
```

Dark mode follows CSS `color-scheme`. The `useColorScheme` hook (from
`@wisp-ui/react/theme`) chooses it for the page and remembers the choice. Opt in to calmer
motion with `data-wisp-motion="standard"`, and higher contrast with
`data-wisp-contrast="high"` (a system set to `prefers-contrast: more` gets it by itself,
unless the attribute is set on `<html>`). Override any component through its token, e.g.
`--md-comp-button-filled-container-color`.

## Shapes

```tsx
import { Shape, shapes } from '@wisp-ui/react/shapes';

<Shape shape={shapes.cookie9Sided} size={64} />;
```

Thirty-five ready-made shapes, a toolkit to make your own, and an exact morph between any
two. See [shapes and morphing](https://r007.github.io/wisp-ui/docs/shapes/).

Requires React 19 and a current browser (cascade layers, `color-mix()`, `light-dark()`,
popover, anchor positioning).

Apache-2.0. See the [repository](https://github.com/r007/wisp-ui) and its
[credits](https://r007.github.io/wisp-ui/docs/licences/).
