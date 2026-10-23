---

title: Accessibility
description: Native elements, established ARIA patterns, real keyboard support, and how it is checked.
section: Guides
order: 20
---

Wisp's approach to accessibility is to use what the platform already does well, and to follow the established ARIA patterns where it does not.

## Native first

A button is a `<button>`, and a link is an `<a>`. A checkbox, a radio and a switch are real `<input>`s, so they work in forms, are labelled by a wrapping `<label>`, and are announced by screen readers without help. A dialog is a `<dialog>`, which brings a focus trap, an inert page behind it and Escape to close. Menus and tooltips use the popover attribute. Starting from the right element is worth more than any amount of ARIA on the wrong one.

## Patterns

Where there is no native element, components follow the WAI-ARIA Authoring Practices:

| Component                       | Pattern                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Menu, Fab menu                  | Menu button: arrow keys, Home, End, typing a letter, Escape returns focus to the trigger. |
| Select                          | Select-only combobox: focus stays on the field, with `aria-activedescendant`.             |
| Autocomplete                    | Editable combobox with a list, and a live region that announces how many options match.   |
| Tabs                            | Tabs: roving focus, automatic or manual activation.                                       |
| Accordion                       | Accordion: heading and button headers, panels as regions, arrow keys between headers.     |
| Toolbar                         | Toolbar: one tab stop, arrow keys between controls.                                       |
| Date and time pickers, Calendar | Grid: arrow keys, Page Up and Down, Home and End.                                         |
| Navigation bar, rail and drawer | Landmarks with `aria-current` on the selected destination.                                |

## Names

Every control needs an accessible name. Where a component has no visible text it asks for one: an icon button requires an `aria-label` (the type checker enforces it), and a navigation landmark requires a name. Decorative content, such as icons passed to a component, is hidden from assistive technology, and meaningful content is announced after the label so the name reads naturally.

## Keyboard and focus

Everything that can be done with a pointer can be done with the keyboard. Focus is always visible when you are using one: a 3 pixel ring, offset from the component, in a colour with enough contrast against the page. A pointer press does not show the ring.

## Motion

`prefers-reduced-motion` is respected everywhere, including animation that runs in script. See [motion](/docs/motion/).

## Colour and contrast

The palettes are generated so that every text colour has enough contrast on the surface it is used on, in light and in dark. For people who need more, the baseline has medium and high contrast levels, selected by `data-wisp-contrast` or by the system's `prefers-contrast: more`. See [theming](/docs/theming/#contrast). In forced-colors mode (Windows high contrast), components restore a visible boundary and use system colours.

## How it is checked

- Every example in these docs is a story, and each runs an automated axe check that must pass, including colour contrast, in both the light and the dark scheme.
- Behaviour is tested with real keyboard and pointer input in a real browser, on Chromium, Firefox and WebKit.
- Names, roles and states are asserted, not assumed.

> [!NOTE]
> Automated checks catch a good deal, but not everything, and Wisp is a pre-release library that has not yet had a review by people who use assistive technology every day. If something is wrong, or does not feel right, [please tell us](https://github.com/r007/wisp-ui/issues).
