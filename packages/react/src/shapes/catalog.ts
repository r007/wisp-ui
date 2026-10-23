/**
 * A catalogue of 35 ready-made shapes, all in the unit square and all made of the same kind of
 * outline, so any one can morph into any other.
 *
 * The shapes and the numbers that define them follow the catalogue in Flutter's `material_ui`
 * (`material_shapes.dart`), Copyright 2013 The Flutter Authors, BSD-3-Clause, itself a port of
 * the Compose Material 3 shape catalogue, Copyright 2023 The Android Open Source Project,
 * Apache-2.0.
 *
 * Changes from the original: each shape is built the first time it is read, then kept, so
 * importing the catalogue costs nothing until a shape is used.
 */

import {
  add,
  direction,
  distance,
  type Point,
  type PointTransformer,
  point,
  rotate,
  scale,
  subtract,
} from './math.js';
import { type CornerRounding, RoundedPolygon } from './rounded-polygon.js';

const CENTER = point(0.5, 0.5);

const round = (radius: number, smoothing = 0): CornerRounding => ({ radius, smoothing });
const ROUND_15 = round(0.15);
const ROUND_20 = round(0.2);
const ROUND_30 = round(0.3);
const ROUND_50 = round(0.5);
const ROUND_100 = round(1);

const NEGATIVE_45 = (-45 * Math.PI) / 180;
const NEGATIVE_90 = (-90 * Math.PI) / 180;
const NEGATIVE_135 = (-135 * Math.PI) / 180;

/** Turns about the origin by `angle` radians. */
const rotateZ =
  (angle: number): PointTransformer =>
  (x, y) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [cos * x - sin * y, sin * x + cos * y];
  };

/** Stretches by `sx` and `sy`, then applies `then`. */
const stretchThen =
  (sx: number, sy: number, then?: PointTransformer): PointTransformer =>
  (x, y) =>
    then ? then(x * sx, y * sy) : [x * sx, y * sy];

/** A vertex and how it is rounded. */
type PointAndRounding = readonly [Point, CornerRounding?];

const p = (x: number, y: number, rounding?: CornerRounding): PointAndRounding => [
  point(x, y),
  rounding,
];

/**
 * A polygon from a pattern of points, repeated `reps` times round the centre: turned for each
 * repeat, or, with `mirroring`, alternately mirrored, which makes the pattern's reflection a
 * neighbour of itself.
 */
function customPolygon(
  pnr: readonly PointAndRounding[],
  reps: number,
  { center = CENTER, mirroring = false }: { center?: Point; mirroring?: boolean } = {},
): RoundedPolygon {
  const actualPoints = doRepeat(pnr, reps, center, mirroring);
  return RoundedPolygon.fromVertices(
    actualPoints.map(([vertex]) => vertex),
    {
      perVertexRounding: actualPoints.map(([, rounding]) => rounding ?? round(0)),
      center,
    },
  );
}

function doRepeat(
  points: readonly PointAndRounding[],
  reps: number,
  center: Point,
  mirroring: boolean,
): PointAndRounding[] {
  const result: PointAndRounding[] = [];
  if (mirroring) {
    const measures = points.map(([vertex]) => {
      const off = subtract(vertex, center);
      return { angle: direction(off), distance: distance(off) };
    });
    const actualReps = reps * 2;
    const sectionAngle = (Math.PI * 2) / actualReps;
    for (let r = 0; r < actualReps; r++) {
      for (let index = 0; index < points.length; index++) {
        const even = r % 2 === 0;
        const i = even ? index : points.length - 1 - index;
        if (i > 0 || even) {
          const measure = measures[i] as { angle: number; distance: number };
          const first = measures[0] as { angle: number; distance: number };
          const a =
            sectionAngle * r +
            (even ? measure.angle : sectionAngle - measure.angle + 2 * first.angle);
          const finalPoint = add(scale(point(Math.cos(a), Math.sin(a)), measure.distance), center);
          result.push([finalPoint, (points[i] as PointAndRounding)[1]]);
        }
      }
    }
  } else {
    const np = points.length;
    for (let i = 0; i < np * reps; i++) {
      const [vertex, rounding] = points[i % np] as PointAndRounding;
      result.push([rotate(vertex, (Math.trunc(i / np) * 360) / reps, center), rounding]);
    }
  }
  return result;
}

const builders = {
  circle: () => RoundedPolygon.circle({ numVertices: 10, radius: 0.5, center: CENTER }),
  square: () =>
    RoundedPolygon.rectangle({ width: 1, height: 1, rounding: ROUND_30, center: CENTER }),
  slanted: () =>
    customPolygon(
      [p(0.926, 0.97, round(0.189, 0.811)), p(-0.021, 0.967, round(0.187, 0.057))],
      2,
    ).normalized(),
  arch: () =>
    RoundedPolygon.regular(4, { perVertexRounding: [ROUND_100, ROUND_100, ROUND_20, ROUND_20] })
      .transformed(rotateZ(NEGATIVE_135))
      .normalized(),
  semiCircle: () =>
    RoundedPolygon.rectangle({
      width: 1.6,
      height: 1,
      perVertexRounding: [ROUND_20, ROUND_20, ROUND_100, ROUND_100],
    }).normalized(),
  oval: () =>
    RoundedPolygon.circle()
      .transformed(stretchThen(1, 0.64, rotateZ(NEGATIVE_45)))
      .normalized(),
  pill: () =>
    customPolygon([p(0.961, 0.039, round(0.426)), p(1.001, 0.428), p(1, 0.609, round(1))], 2, {
      mirroring: true,
    }).normalized(),
  triangle: () =>
    RoundedPolygon.regular(3, { rounding: ROUND_20 })
      .transformed(rotateZ(NEGATIVE_90))
      .normalized(),
  arrow: () =>
    customPolygon(
      [
        p(0.5, 0.892, round(0.313)),
        p(-0.216, 1.05, round(0.207)),
        p(0.499, -0.16, round(0.215, 1)),
        p(1.225, 1.06, round(0.211)),
      ],
      1,
    ).normalized(),
  fan: () =>
    customPolygon(
      [
        p(1.004, 1, round(0.148, 0.417)),
        p(0, 1, round(0.151)),
        p(0, -0.003, round(0.148)),
        p(0.978, 0.02, round(0.803)),
      ],
      1,
    ).normalized(),
  diamond: () =>
    customPolygon([p(0.5, 1.096, round(0.151, 0.524)), p(0.04, 0.5, round(0.159))], 2).normalized(),
  clamShell: () =>
    customPolygon(
      [p(0.171, 0.841, round(0.159)), p(-0.02, 0.5, round(0.14)), p(0.17, 0.159, round(0.159))],
      2,
    ).normalized(),
  pentagon: () =>
    customPolygon(
      [p(0.5, -0.009, round(0.172)), p(1.03, 0.365, round(0.164)), p(0.828, 0.97, round(0.169))],
      1,
      { mirroring: true },
    ).normalized(),
  gem: () =>
    customPolygon(
      [
        p(0.499, 1.023, round(0.241, 0.778)),
        p(-0.005, 0.792, round(0.208)),
        p(0.073, 0.258, round(0.228)),
        p(0.433, -0, round(0.491)),
      ],
      1,
      { mirroring: true },
    ).normalized(),
  sunny: () => RoundedPolygon.star(8, { innerRadius: 0.8, rounding: ROUND_15 }).normalized(),
  verySunny: () =>
    customPolygon([p(0.5, 1.08, round(0.085)), p(0.358, 0.843, round(0.085))], 8).normalized(),
  cookie4Sided: () =>
    customPolygon([p(1.237, 1.236, round(0.258)), p(0.5, 0.918, round(0.233))], 4).normalized(),
  cookie6Sided: () =>
    customPolygon([p(0.723, 0.884, round(0.394)), p(0.5, 1.099, round(0.398))], 6).normalized(),
  cookie7Sided: () =>
    RoundedPolygon.star(7, { innerRadius: 0.75, rounding: ROUND_50 })
      .transformed(rotateZ(NEGATIVE_90))
      .normalized(),
  cookie9Sided: () =>
    RoundedPolygon.star(9, { innerRadius: 0.8, rounding: ROUND_50 })
      .transformed(rotateZ(NEGATIVE_90))
      .normalized(),
  cookie12Sided: () =>
    RoundedPolygon.star(12, { innerRadius: 0.8, rounding: ROUND_50 })
      .transformed(rotateZ(NEGATIVE_90))
      .normalized(),
  clover4Leaf: () =>
    customPolygon([p(0.5, 0.074), p(0.725, -0.099, round(0.476))], 4, {
      mirroring: true,
    }).normalized(),
  clover8Leaf: () => customPolygon([p(0.5, 0.036), p(0.758, -0.101, round(0.209))], 8).normalized(),
  burst: () =>
    customPolygon([p(0.5, -0.006, round(0.006)), p(0.592, 0.158, round(0.006))], 12).normalized(),
  softBurst: () =>
    customPolygon([p(0.193, 0.277, round(0.053)), p(0.176, 0.055, round(0.053))], 10).normalized(),
  boom: () =>
    customPolygon([p(0.457, 0.296, round(0.007)), p(0.5, -0.051, round(0.007))], 15).normalized(),
  softBoom: () =>
    customPolygon(
      [
        p(0.733, 0.454),
        p(0.839, 0.437, round(0.532)),
        p(0.949, 0.449, round(0.439, 1)),
        p(0.998, 0.478, round(0.174)),
      ],
      16,
      { mirroring: true },
    ).normalized(),
  flower: () =>
    customPolygon(
      [p(0.37, 0.187), p(0.416, 0.049, round(0.381)), p(0.479, 0.001, round(0.095))],
      8,
      { mirroring: true },
    ).normalized(),
  puffy: () =>
    customPolygon(
      [
        p(0.5, 0.053),
        p(0.545, -0.04, round(0.405)),
        p(0.67, -0.035, round(0.426)),
        p(0.717, 0.066, round(0.574)),
        p(0.722, 0.128),
        p(0.777, 0.002, round(0.36)),
        p(0.914, 0.149, round(0.66)),
        p(0.926, 0.289, round(0.66)),
        p(0.881, 0.346),
        p(0.94, 0.344, round(0.126)),
        p(1.003, 0.437, round(0.255)),
      ],
      2,
      { mirroring: true },
    )
      .transformed(stretchThen(1, 0.742))
      .normalized(),
  puffyDiamond: () =>
    customPolygon([p(0.87, 0.13, round(0.146)), p(0.818, 0.357), p(1, 0.332, round(0.853))], 4, {
      mirroring: true,
    }).normalized(),
  ghostish: () =>
    customPolygon(
      [
        p(0.5, 0, round(1)),
        p(1, 0, round(1)),
        p(1, 1.14, round(0.254, 0.106)),
        p(0.575, 0.906, round(0.253)),
      ],
      1,
      { mirroring: true },
    ).normalized(),
  pixelCircle: () =>
    customPolygon(
      [
        p(0.5, 0),
        p(0.704, 0),
        p(0.704, 0.065),
        p(0.843, 0.065),
        p(0.843, 0.148),
        p(0.926, 0.148),
        p(0.926, 0.296),
        p(1, 0.296),
      ],
      2,
      { mirroring: true },
    ).normalized(),
  pixelTriangle: () =>
    customPolygon(
      [
        p(0.11, 0.5),
        p(0.113, 0),
        p(0.287, 0),
        p(0.287, 0.087),
        p(0.421, 0.087),
        p(0.421, 0.17),
        p(0.56, 0.17),
        p(0.56, 0.265),
        p(0.674, 0.265),
        p(0.675, 0.344),
        p(0.789, 0.344),
        p(0.789, 0.439),
        p(0.888, 0.439),
      ],
      1,
      { mirroring: true },
    ).normalized(),
  bun: () =>
    customPolygon(
      [p(0.796, 0.5), p(0.853, 0.518, round(1)), p(0.992, 0.631, round(1)), p(0.968, 1, round(1))],
      2,
      { mirroring: true },
    ).normalized(),
  heart: () =>
    customPolygon(
      [
        p(0.5, 0.268, round(0.016)),
        p(0.792, -0.066, round(0.958)),
        p(1.064, 0.276, round(1)),
        p(0.501, 0.946, round(0.129)),
      ],
      1,
      { mirroring: true },
    ).normalized(),
} satisfies Record<string, () => RoundedPolygon>;

/** The name of a shape in the catalogue. */
export type ShapeName = keyof typeof builders;

/** Every name in the catalogue. */
export const shapeNames = Object.keys(builders) as readonly ShapeName[];

const cache = new Map<ShapeName, RoundedPolygon>();

/** The shape called `name`, built on first use. */
export function getShape(name: ShapeName): RoundedPolygon {
  let shape = cache.get(name);
  if (!shape) {
    shape = builders[name]();
    cache.set(name, shape);
  }
  return shape;
}

/**
 * The catalogue: `shapes.heart`, `shapes.cookie9Sided`, … Each is a {@link RoundedPolygon} in the
 * unit square, built when first read. All can morph into each other.
 */
export const shapes: Readonly<Record<ShapeName, RoundedPolygon>> =
  /* @__PURE__ */ Object.defineProperties(
    {} as Record<ShapeName, RoundedPolygon>,
    Object.fromEntries(
      shapeNames.map((name) => [name, { enumerable: true, get: () => getShape(name) }]),
    ),
  );
