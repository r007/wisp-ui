---

title: Dark mode
description: Follow the system, let people choose, remember the choice, and never flash the wrong theme.
section: Foundations
order: 12
---

Every colour in Wisp is a `light-dark()` pair. Which half is used depends on the CSS `color-scheme` of the element, so dark mode is one CSS property, not a second set of components.

## The default: follow the system

`theme.css` sets `color-scheme: light dark` on the page. With nothing else, Wisp is light when the visitor's system is light and dark when it is dark, and changes live when the setting does.

## Choosing a scheme

`color-scheme` can be set on the page, or on any element, to force a scheme for that subtree:

```css
.reading-pane {
  color-scheme: dark;
}
```

For a page-wide choice, `@wisp-ui/tokens` has helpers that set it, remember it and read it back:

```ts
import { applyColorScheme, readColorScheme, storeColorScheme } from '@wisp-ui/tokens';

applyColorScheme('dark'); // the page is dark
applyColorScheme('light'); // the page is light
applyColorScheme('system'); // the page follows the system again

storeColorScheme('dark'); // remember it in localStorage
readColorScheme(); // 'light' | 'dark' | 'system'
```

`applyColorScheme` takes an element as a second argument, so a part of the page can be themed on its own. It also sets a `data-wisp-color-scheme` attribute you can style by.

## In React

The `useColorScheme` hook does all of that for you. It follows the system and other tabs, remembers the choice, and keeps it for the life of the page when storage is blocked:

```tsx
import { useColorScheme } from '@wisp-ui/react/theme';
import { SegmentedButton, SegmentedButtonItem } from '@wisp-ui/react/segmented-button';

export function SchemePicker() {
  const { scheme, setScheme, resolved } = useColorScheme();
  return (
    <SegmentedButton
      aria-label="Colour scheme"
      value={scheme}
      onValueChange={(value) => setScheme(value as 'light' | 'dark' | 'system')}
    >
      <SegmentedButtonItem value="light">Light</SegmentedButtonItem>
      <SegmentedButtonItem value="dark">Dark</SegmentedButtonItem>
      <SegmentedButtonItem value="system">System</SegmentedButtonItem>
    </SegmentedButton>
  );
}
```

`scheme` is the choice, and `resolved` is what is on screen: `light` or `dark`, with `system` turned into whichever the system asks for. Use it for things like an icon that shows the current mode. This site is built with it, so try the theme menu in the header.

## Avoid a flash of the wrong theme

React runs after the first paint, so a visitor who chose dark would see a light page for a moment. `colorSchemeScript` is a short inline script that applies the remembered choice before anything is painted. Put it in the document's `<head>`:

```tsx
import { colorSchemeScript } from '@wisp-ui/tokens';

// In your root layout or HTML template:
<script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />;
```

In plain HTML, paste its text:

```html
<script>
  (function(){try{var s=localStorage.getItem("wisp-color-scheme");if(s==="light"||s==="dark"){var r=document.documentElement;r.style.setProperty("color-scheme",s);r.dataset.wispColorScheme=s}}catch(e){}})()
</script>
```

> [!NOTE]
> The script stores nothing and needs no library. It only reads the key that `storeColorScheme` and `useColorScheme` write, so the two always agree.

## Your own CSS

Use the system tokens and your styles follow the scheme for free:

```css
.card {
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
}
```

Where you need a colour of your own, `light-dark()` takes the two values:

```css
.badge {
  background: light-dark(#fff3cd, #4a3b00);
}
```

## Contrast

Dark mode composes with the contrast levels: `data-wisp-contrast="medium"` or `"high"` on the page, or the system's `prefers-contrast: more`. See [theming](/docs/theming/#contrast).

## How it is tested

Every example in this documentation is a story that is checked for accessibility with axe, including colour contrast. CI runs all of them twice, once in the light scheme and once in the dark.
