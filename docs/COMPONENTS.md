# Component status

Wisp ports Flutter's Material library, using the Material 3 **Expressive** tokens
(release 38.2.83). The token data has **54 component namespaces**; this table maps
them to components, the Flutter widget to read, and the archetype to copy from
(see the [porting guide](porting-guide.md)).

✅ ported · ⬜ not started

## Ported

| Component               | Tokens (`md.comp.*`)  | Notes                                                                                                                                       |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ **Button**           | `button` (358 tokens) | Elevated, filled, tonal, outlined, text; 5 sizes; round/square; toggle with shape morph; link; `render`                                     |
| ✅ **IconButton**       | `icon-button`         | 4 variants; 5 sizes; narrow/default/wide; toggle with `selectedIcon`; requires `aria-label`                                                 |
| ✅ **Switch**           | `switch`              | Native `<input role="switch">`; optional icons; spring handle; RTL                                                                          |
| ✅ **NavigationBar**    | `nav-bar`             | Expressive 64px bar; vertical and horizontal items; label behaviours; badges. Uses the new `nav-bar` tokens, not the older `navigation-bar` |
| ✅ **NavigationDrawer** | `navigation-drawer`   | Standard and modal (native `<dialog>`); sections, dividers, trailing counts                                                                 |
| ✅ **Badge**            | `badge`               | Dot or labelled pill                                                                                                                        |

## Next up (suggested order)

Ordered by how much of the remaining set each unlocks.

| Component                        | Tokens                                                                 | Flutter widget                                         | Archetype                 | Unlocks / notes                                                           |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------- |
| ⬜ Checkbox                      | `checkbox`                                                             | `Checkbox`                                             | native input (Switch)     | forms; Radio and list items reuse it                                      |
| ⬜ Radio                         | `radio-button`                                                         | `Radio`                                                | native input (Switch)     |                                                                           |
| ⬜ Text field                    | `filled-text-field`, `outlined-text-field`                             | `TextField`                                            | native input              | label animation, supporting text, error state                             |
| ⬜ Card                          | `elevated-card`, `filled-card`, `outlined-card`                        | `Card`                                                 | pressable                 | simple, high value                                                        |
| ⬜ Chips                         | `assist-chip`, `filter-chip`, `input-chip`, `suggestion-chip`, `chips` | `ActionChip`, `FilterChip`, `InputChip`                | pressable                 | selection patterns                                                        |
| ⬜ Dialog                        | `dialog`, `full-screen-dialog`                                         | `Dialog`                                               | overlay (drawer)          | native `<dialog>`; mostly done by the drawer                              |
| ⬜ Snackbar                      | `snackbar`                                                             | `SnackBar`                                             | overlay                   | needs a toast/queue primitive                                             |
| ⬜ Tooltip                       | `plain-tooltip`, `rich-tooltip`                                        | `Tooltip`                                              | overlay                   | needs the **popover/anchor** primitive                                    |
| ⬜ Menu                          | `menu`, `menus`                                                        | `MenuAnchor`, `PopupMenuButton`                        | overlay                   | popover primitive + list item primitive                                   |
| ⬜ Tabs                          | `primary-navigation-tab`, `secondary-navigation-tab`                   | `TabBar`                                               | composite (NavigationBar) | indicator animation, roving focus                                         |
| ⬜ Navigation rail               | `nav-rail` (and older `navigation-rail`)                               | `NavigationRail`                                       | composite                 | expanded/collapsed; reuse NavigationBar items                             |
| ⬜ Top app bar                   | `app-bar`                                                              | `AppBar`                                               | layout                    | small/medium/large, scroll behaviour                                      |
| ⬜ List                          | `list`                                                                 | `ListTile`                                             | composite                 | the shared list-item primitive for menus, drawer                          |
| ⬜ Divider                       | `divider`                                                              | `Divider`                                              | trivial                   | already styled inside the drawer                                          |
| ⬜ FAB / Extended FAB / FAB menu | `fab`, `extended-fab`, `fab-menu`                                      | `FloatingActionButton`                                 | pressable                 | 140 + 180 + 117 tokens                                                    |
| ⬜ Button group / Split button   | `button-group`, `split-button`                                         | none yet                                               | composite                 | Expressive: neighbours react to a press (`pressed.item.width.multiplier`) |
| ⬜ Segmented button              | `outlined-segmented-button`                                            | `SegmentedButton`                                      | composite                 |                                                                           |
| ⬜ Slider                        | `slider`                                                               | `Slider`, `RangeSlider`                                | native input              | 5 sizes in Expressive                                                     |
| ⬜ Progress indicators           | `progress-indicator`, `loading-indicator`                              | `LinearProgressIndicator`, `CircularProgressIndicator` | SVG/CSS                   | wavy variants; loading indicator uses shape morphing                      |
| ⬜ Search                        | `search-bar`, `search-view`                                            | `SearchBar`, `SearchAnchor`                            | composite + overlay       |                                                                           |
| ⬜ Sheets                        | `sheet`, `drag-handle`                                                 | `BottomSheet`                                          | overlay                   | bottom, side and floating                                                 |
| ⬜ Banner                        | `banner`                                                               | `MaterialBanner`                                       | simple                    |                                                                           |
| ⬜ Carousel                      | `carousel-item`                                                        | `CarouselView`                                         | scroll-snap               |                                                                           |
| ⬜ Toolbar                       | `toolbar`                                                              | none yet                                               | composite                 | Expressive                                                                |
| ⬜ Bottom app bar                | `bottom-app-bar`                                                       | `BottomAppBar`                                         | layout                    |                                                                           |
| ⬜ Date / time pickers           | `date-picker`, `date-input`, `time-picker`, `time-input`               | `showDatePicker`, `showTimePicker`                     | complex                   | 147 + 71 tokens; consider a headless base                                 |

## Foundation still to build

| Piece                                           | Needed by                                 | Notes                                                                               |
| ----------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| **Popover / anchor positioning primitive**      | Menu, Tooltip, Select, Search             | Native `popover` + CSS anchor positioning, with a JS fallback only if needed        |
| **List item primitive**                         | List, Menu, Drawer, Select                | Shared leading/trailing/overline/supporting-text layout                             |
| **Material Shapes** (`RoundedPolygon` morphing) | Loading indicator, FAB, expressive shapes | Flutter 1.8.0 ships `MaterialShapes`; CSS `shape()` / `clip-path` or SVG path morph |
| **Typography** component / utility classes      | everything                                | The `--md-sys-typescale-*` tokens exist; no component yet                           |
| **`prefers-contrast` mapping**                  | accessibility                             | `data-wisp-contrast` exists; map the media query to it                              |
| **Toast / queue**                               | Snackbar                                  |                                                                                     |
| **Docs site**                                   | adoption                                  | Storybook is the component explorer; a marketing/docs site is planned               |

## Expressive features used so far

Springs (fast spatial for shape morphing, fast effects for colour) · shape morph on
press and toggle · five button/icon-button sizes · Expressive nav bar tokens · the
Standard/Expressive motion switch.

Not yet used: `MaterialShapes` morphing, emphasised type scale (tokens exist), wavy
progress, loading indicator, button groups, split buttons, FAB menu, toolbars.
