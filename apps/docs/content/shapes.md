---

title: Shapes and morphing
description: Thirty-five ready-made shapes, a rounded-polygon toolkit to make your own, and an exact morph between any two.
section: Foundations
order: 15
---

The shapes toolkit is a small, self-contained part of the library: it draws shapes, builds new ones, and works out how to turn any shape into any other.

```tsx
import { Shape, shapes } from '@wisp-ui/react/shapes';

<Shape shape={shapes.cookie9Sided} size={64} />;
```

## The catalogue

`shapes` holds thirty-five shapes. Each is a `RoundedPolygon` in the unit square, built the first time you read it, so importing the catalogue costs nothing until you use one:

`circle`, `square`, `slanted`, `arch`, `semiCircle`, `oval`, `pill`, `triangle`, `arrow`, `fan`, `diamond`, `clamShell`, `pentagon`, `gem`, `sunny`, `verySunny`, `cookie4Sided`, `cookie6Sided`, `cookie7Sided`, `cookie9Sided`, `cookie12Sided`, `clover4Leaf`, `clover8Leaf`, `burst`, `softBurst`, `boom`, `softBoom`, `flower`, `puffy`, `puffyDiamond`, `ghostish`, `pixelCircle`, `pixelTriangle`, `bun`, `heart`

`shapeNames` lists them in that order, and `getShape(name)` looks one up by name. See them all, and morph between them, in the [Shape component's examples](/components/shapes/).

## The `Shape` component

`Shape` draws a shape as an `<svg>`, filled with the surrounding text colour. When its `shape` changes, the old outline morphs into the new one as a spring:

```tsx
function Mood({ happy }: { happy: boolean }) {
  return <Shape shape={happy ? shapes.heart : shapes.softBurst} size={96} aria-label="Mood" />;
}
```

It is decorative unless you give it an `aria-label`, which makes it an image. With reduced motion, or `animated={false}`, the outline changes at once. The morph runs on the path directly, so it causes no React renders.

## Make your own

A `RoundedPolygon` is a closed outline of curves, built from points and how rounded each corner is. There are factories for the common cases:

```ts
import { RoundedPolygon } from '@wisp-ui/react/shapes';

// A six-pointed star with rounded points and softer valleys.
const star = RoundedPolygon.star(6, {
  innerRadius: 0.62,
  rounding: { radius: 0.18, smoothing: 0.4 },
  innerRounding: { radius: 0.1 },
}).normalized();

const hexagon = RoundedPolygon.regular(6, { rounding: { radius: 0.2 } }).normalized();
const capsule = RoundedPolygon.pill({ width: 2, height: 1 }).normalized();

// Any vertices you like, each with its own rounding.
const kite = RoundedPolygon.fromVertices(
  [
    { x: 0.5, y: 0 },
    { x: 1, y: 0.4 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.4 },
  ],
  { rounding: { radius: 0.08 } },
);
```

A corner's `rounding` has a `radius`, and a `smoothing` from 0 to 1 that flattens the transition from the curve into the edge. `normalized()` scales and centres the shape in the unit square, which is where `Shape` expects it.

Also available: `RoundedPolygon.circle()`, `.rectangle()`, `.pillStar()` and `.fromFeatures()`, and `.transformed(fn)` to move, turn or scale one.

## Morphing

A `Morph` works out how two polygons map onto each other: it pairs the corners of one with the corners of the other, by how near they are and whether they bend the same way, and splits curves where the two have different numbers. That work is done once, when you make it. After that, any progress is cheap:

```ts
import { Morph, shapes } from '@wisp-ui/react/shapes';

const morph = new Morph(shapes.circle, shapes.heart);

morph.toSvgPath(0); // the circle
morph.toSvgPath(1); // the heart
morph.toSvgPath(0.5); // half way, as a path for <path d="…">
```

Values outside 0 to 1 overshoot, which is what a spring does. `morph.toCubics(progress)` gives the curves themselves, and `calculateMaxBounds()` a square that holds the morph at every progress, however it is turned.

### Animating one

Drive the progress yourself with the spring the library uses:

```tsx
import {
  cubicsToPath,
  Morph,
  shapes,
  springPosition,
  springSettleSeconds,
} from '@wisp-ui/react/shapes';
import { useEffect, useRef } from 'react';

export function Beat() {
  const path = useRef<SVGPathElement>(null);

  useEffect(() => {
    const morph = new Morph(shapes.circle, shapes.heart);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const seconds = (now - start) / 1000;
      path.current?.setAttribute('d', morph.toSvgPath(springPosition(seconds)));
      if (seconds < springSettleSeconds()) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      viewBox="0 0 1 1"
      width={96}
      height={96}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <path ref={path} fill="currentColor" d={cubicsToPath(shapes.circle.cubics)} />
    </svg>
  );
}
```

`springPosition(seconds)` is 0 at the start, overshoots 1, and comes to rest at it; `springSettleSeconds()` says when. The loading indicator uses exactly this to turn through its seven shapes.

> [!NOTE]
> The morph keeps every outline continuous: the end of each curve is the start of the next, at any progress, for any two shapes in the catalogue. A test checks all 1,225 pairs.

## Attribution

The shape algorithms and the catalogue are ported, with tests, from open-source implementations. See the [licences and credits](/docs/licences/).
