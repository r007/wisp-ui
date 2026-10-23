# @wisp-ui/react

## 0.1.0

### Minor Changes

- d0235f2: Initial pre-release.

  **Tokens** (`@wisp-ui/tokens`): design tokens as CSS custom properties (colour roles as `light-dark()` pairs, type, shape, elevation, state and spring motion), a dynamic-colour theme generator (`applyTheme`, `createThemeCss`), and dark mode helpers: `applyColorScheme`, `readColorScheme`, `storeColorScheme`, `resolveColorScheme` and `colorSchemeScript`, an inline `<head>` script that applies the remembered choice before the first paint.

  **Components** (`@wisp-ui/react`): Accordion, Autocomplete, Badge, Banner, BottomAppBar, Button, ButtonGroup, Card, Carousel, Checkbox, Chip, DatePicker, DatePickerDialog, DateRangePicker and DateRangePickerDialog, Dialog, Divider, Fab, FabMenu, IconButton, List, LoadingIndicator, Menu, NavigationBar, NavigationDrawer, NavigationRail, Progress (linear and circular), Radio, Search, SearchBar, SegmentedButton, Select, Sheet and StandardSheet, Slider and RangeSlider, Snackbar, SplitButton, Switch, Tabs, TextField, TimePicker and TimePickerDialog, Toolbar, Tooltip, TopAppBar and Typography.

  **Shapes** (`@wisp-ui/react/shapes`): thirty-five ready-made shapes, `RoundedPolygon`, `Morph` (an exact, feature-matched morph between any two shapes), `Shape` (an SVG component that morphs when its shape changes) and the spring it moves on. The loading indicator is built on it.

  **Dark mode**: the `useColorScheme` hook in `@wisp-ui/react/theme`.

### Patch Changes

- Updated dependencies [d0235f2]
  - @wisp-ui/tokens@0.1.0
