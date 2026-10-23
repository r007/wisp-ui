---

title: Customizing
description: Classes, data attributes, the cascade layer, the render prop and component tokens: how to change what a component looks like and is.
section: Foundations
order: 14
---

Wisp's components are ordinary elements with ordinary CSS, so customising one is mostly ordinary CSS too.

## Classes and styles

Every component accepts `className` and `style`, and passes the other props it does not use to the element it renders:

```tsx
<Button className="hero-cta" style={{ marginBlockStart: 24 }} data-analytics="start">
  Get started
</Button>;
```

Class names the library generates are scoped and hashed, so they are not a selector to rely on. Instead, components set **data attributes** that describe their state. The common ones, which not every component has:

| Attribute       | Means                                                         |
| --------------- | ------------------------------------------------------------- |
| `data-variant`  | Which variant a component is, such as `filled` or `outlined`. |
| `data-selected` | A toggle or an option is selected.                            |
| `data-open`     | An overlay or a disclosure is open.                           |
| `data-disabled` | The component is disabled.                                    |
| `data-slot`     | A named part inside a component, such as `field` or `label`.  |

```css
.toolbar [data-variant='filled'][data-selected] {
  outline: 2px solid currentColor;
}
```

## The cascade layer

All of Wisp's CSS is in a cascade layer called `wisp`. **Styles outside any layer beat styles in a layer**, whatever their specificity, so your own CSS wins without `!important` or long selectors.

A global reset is the one thing to be careful with: an unlayered `button { font: inherit }` would override the library's button. Put resets in a layer declared before `wisp`:

```css
@layer reset, wisp;

@layer reset {
  button {
    font: inherit;
  }
}
```

This site does the same for its own element styles.

## Component tokens

For a change to a whole class of components, set a [component token](/docs/theming/#overriding-one-component) on an ancestor instead of writing selectors:

```css
.checkout {
  --md-comp-button-filled-container-color: var(--md-sys-color-tertiary);
}
```

## Render another element

Components that can be links accept a `render` prop: an element that is rendered in place of the default one, with the component's props and handlers merged onto it. It is how you use your router's link, or a framework's image component:

```tsx
import { Link } from 'react-router';

<ListItem headline="Inbox" render={<Link to="/inbox" />} />;
```

## Refs

Every component forwards a `ref` to the element it renders, as a normal prop, since React 19:

```tsx
const ref = useRef<HTMLButtonElement>(null);
<Button ref={ref}>Focus me</Button>;
```

## Right to left

Components use logical CSS properties and `:dir()`, so they follow the document or element direction with no extra work. Set `dir="rtl"` on `<html>` or on any element.

## Composing

Compound components share what they need through context, so structure matters: a `Tab` goes in a `TabList` in `Tabs`, a `MenuItem` in a `Menu`, and an `AccordionItem` in an `Accordion`. Each component's page shows the shape it expects, and a component used outside its parent throws an error that says so.
