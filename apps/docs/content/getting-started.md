---

title: Getting started
description: Install Wisp, load the theme once, and use your first component.
section: Start
order: 1
---

Wisp is a set of React components with plain CSS, native elements and no runtime styling engine. This page takes you from an empty project to a working button.

## Requirements

- **React 19.** It is the one peer dependency.
- **A bundler that handles CSS imports** from packages: Vite, webpack, Rspack, Parcel and the frameworks built on them.
- **A current browser.** Wisp uses cascade layers, `light-dark()`, `color-mix()`, the popover attribute and CSS anchor positioning. See [browser support](/docs/browser-support/).

## Install

```bash
npm install @wisp-ui/react
```

`@wisp-ui/tokens`, which holds the design tokens and the colour generator, comes with it. The package is ESM only and ships its own types.

## Load the theme once

The theme defines the colours, type scale, shapes, elevation and motion that every component reads. Import it at the root of your app, once:

```tsx
import '@wisp-ui/react/theme.css';
```

That is all the setup there is: no provider to wrap your app in, and no configuration file.

## Use a component

Import a component from its own entry, or from the package root. Either way you get that component's styles and nothing else:

```tsx
import { Button } from '@wisp-ui/react/button';

export function Save() {
  return <Button variant="filled">Save something good</Button>;
}
```

```tsx
// The same, from the root.
import { Button } from '@wisp-ui/react';
```

> [!NOTE]
> Each component owns its CSS. Importing a button gives you a button's styles, not the library's. CI checks every entry against a size budget, through both import styles, so this stays true.

## Fonts and icons are yours

The type tokens ask for **Roboto** and fall back to the system UI font. Load Roboto however you like, for example with [Fontsource](https://fontsource.org/fonts/roboto):

```tsx
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
```

To use another typeface, set the two reference variables:

```css
:root {
  --md-ref-typeface-brand: 'Inter', system-ui, sans-serif;
  --md-ref-typeface-plain: 'Inter', system-ui, sans-serif;
}
```

Components never bring icons. Wherever one is wanted (`icon`, `leading`, `trailingIcon`) pass any React node: an inline SVG, or a component from the icon library you already use. Icon-only controls require an `aria-label`, since there is no text to name them.

## Links and routers

A button, an icon button, a list item and a menu item all become links when you give them an `href`. To use your router's link component instead, pass it to `render`:

```tsx
import { Link } from 'react-router';
import { Button } from '@wisp-ui/react/button';

<Button render={<Link to="/settings" />}>Settings</Button>;
```

## Colour, light and dark

Out of the box the theme follows the visitor's system setting, light or dark. To make the palette your own, or to let people choose a scheme, see [theming](/docs/theming/) and [dark mode](/docs/dark-mode/).

## Server rendering

Components are client components (`"use client"` is preserved in the build), and need no provider, so they render on the server and hydrate without special handling. Import the theme in your root layout, and put the [dark mode script](/docs/dark-mode/#avoid-a-flash-of-the-wrong-theme) in the document head if you let people choose a scheme.

## Next

- Browse the [components](/components/), each with live examples and its full API.
- Read how to [customise](/docs/customizing/) a component's look.
- Try the [shapes](/docs/shapes/): thirty-five of them, and a morph between any two.
