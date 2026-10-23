# README artwork

The hero and component gallery render the real Wisp React components from source.
The peach/teal gradient, grain and Wisp mark are original CSS/SVG artwork inspired
by the visual references supplied for the README. No reference images are bundled.
Roboto and the Symbols icon set come from the existing Storybook dev dependencies;
they are not added to the component package.

From the repository root, after `pnpm install`:

```bash
node docs/brand/serve.mjs
```

- Hero: <http://localhost:6007/docs/brand/>
- Component gallery: <http://localhost:6007/docs/brand/?view=components>

Capture the hero at **1200 × 700** and the gallery at **1200 × 830**, after the
fonts and seed palettes have loaded. Save the PNGs as `hero.png` and
`components.png` in this folder; palette-compress the hero (its film grain makes a
plain PNG over 800 kB). The documentation site uses the hero as its social image. Both images intentionally use a fixed canvas
size; GitHub scales them to the README column width. Text equivalents and image
descriptions live in the main README.

The previews use the default tonal-spot palette generator with teal `#006a60`
and rose `#9c4146` seeds. Component appearance is supplied by Wisp's own styles;
the surrounding artwork only arranges the components and provides the background.
The README uses static images so its content works without scripts or animation.
