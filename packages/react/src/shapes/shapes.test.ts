/**
 * The geometry tests ported from Flutter's `material_ui` shape tests (Copyright 2013 The Flutter
 * Authors, BSD-3-Clause), which mirror the AndroidX `graphics-shapes` tests. They run the same
 * checks on this port, with the drawing and golden-image tests replaced by the ones at the end.
 */

import { describe, expect, test } from 'vitest';
import { shapeNames, shapes } from './catalog.js';
import { Cubic, cubicsToPath } from './cubic.js';
import { PolygonFeature } from './features.js';
import {
  DoubleMapper,
  doMapping,
  featureDistSquared,
  featureMapper,
  type ProgressableFeature,
} from './mapping.js';
import { distance, ORIGIN, type Point, point, positiveModulo, rotate, subtract } from './math.js';
import { Morph } from './morph.js';
import { LengthMeasurer, MeasuredPolygon } from './polygon-measure.js';
import { type CornerRounding, RoundedPolygon, UNROUNDED } from './rounded-polygon.js';

const EPSILON = 1e-4;

const close = (actual: number, expected: number, epsilon = EPSILON) =>
  expect(Math.abs(actual - expected)).toBeLessThan(epsilon);
const pointsClose = (actual: Point, expected: Point) => {
  close(actual.x, expected.x);
  close(actual.y, expected.y);
};
const cubicsClose = (actual: Cubic, expected: Cubic) => {
  pointsClose(actual.anchor0, expected.anchor0);
  pointsClose(
    point(actual.control0X, actual.control0Y),
    point(expected.control0X, expected.control0Y),
  );
  pointsClose(
    point(actual.control1X, actual.control1Y),
    point(expected.control1X, expected.control1Y),
  );
  pointsClose(actual.anchor1, expected.anchor1);
};
const cubicListsClose = (actual: readonly Cubic[], expected: readonly Cubic[]) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((c, i) => {
    cubicsClose(c, expected[i] as Cubic);
  });
};
const polygonsClose = (actual: RoundedPolygon, expected: RoundedPolygon) => {
  cubicListsClose(actual.cubics, expected.cubics);
  expect(actual.features.length).toBe(expected.features.length);
  actual.features.forEach((f, i) => {
    const e = expected.features[i] as PolygonFeature;
    cubicListsClose(f.cubics, e.cubics);
    expect(f.kind).toBe(e.kind);
  });
};
/** Every anchor and control point of `shape` lies in the box. */
const inBounds = (shape: readonly Cubic[], min: Point, max: Point) => {
  for (const c of shape) {
    for (const [x, y] of [
      [c.anchor0X, c.anchor0Y],
      [c.control0X, c.control0Y],
      [c.control1X, c.control1Y],
      [c.anchor1X, c.anchor1Y],
    ] as const) {
      expect(x).toBeGreaterThanOrEqual(min.x - EPSILON);
      expect(y).toBeGreaterThanOrEqual(min.y - EPSILON);
      expect(x).toBeLessThanOrEqual(max.x + EPSILON);
      expect(y).toBeLessThanOrEqual(max.y + EPSILON);
    }
  }
};
const rotator = (degrees: number) => (x: number, y: number) => {
  const p = rotate(point(x, y), degrees);
  return [p.x, p.y] as const;
};
const finite = (c: Cubic) =>
  [
    c.anchor0X,
    c.anchor0Y,
    c.control0X,
    c.control0Y,
    c.control1X,
    c.control1Y,
    c.anchor1X,
    c.anchor1Y,
  ].every(Number.isFinite);

describe('RoundedPolygon', () => {
  const rounding: CornerRounding = { radius: 0.1 };
  const perVtxRounded = [rounding, rounding, rounding, rounding];
  const MIN = point(-1, -1);
  const MAX = point(1, 1);

  test('regular polygons stay within their radius', () => {
    expect(() => RoundedPolygon.regular(2)).toThrow(RangeError);
    inBounds(RoundedPolygon.regular(4).cubics, MIN, MAX);
    inBounds(RoundedPolygon.regular(4, { radius: 2 }).cubics, point(-2, -2), point(2, 2));
    inBounds(RoundedPolygon.regular(4, { rounding }).cubics, MIN, MAX);
    inBounds(RoundedPolygon.regular(4, { perVertexRounding: perVtxRounded }).cubics, MIN, MAX);
    inBounds(RoundedPolygon.regular(4, { center: point(1, 2) }).cubics, point(0, 1), point(2, 3));
  });

  test('fromVertices', () => {
    const verts = [point(1, 0), point(0, 1), point(-1, 0), point(0, -1)];
    expect(() => RoundedPolygon.fromVertices([point(1, 0), point(0, 1)])).toThrow(RangeError);
    inBounds(RoundedPolygon.fromVertices(verts).cubics, MIN, MAX);
    const offset = point(1, 2);
    inBounds(
      RoundedPolygon.fromVertices(
        verts.map((v) => point(v.x + offset.x, v.y + offset.y)),
        { center: offset },
      ).cubics,
      point(0, 1),
      point(2, 3),
    );
    inBounds(RoundedPolygon.fromVertices(verts, { rounding }).cubics, MIN, MAX);
    inBounds(
      RoundedPolygon.fromVertices(verts, { perVertexRounding: perVtxRounded }).cubics,
      MIN,
      MAX,
    );
    expect(() => RoundedPolygon.fromVertices(verts, { perVertexRounding: [rounding] })).toThrow(
      RangeError,
    );
  });

  test('rejects a negative radius and a smoothing outside 0 to 1', () => {
    const verts = [point(1, 0), point(0, 1), point(-1, 0)];
    expect(() => RoundedPolygon.fromVertices(verts, { rounding: { radius: -1 } })).toThrow(
      RangeError,
    );
    expect(() =>
      RoundedPolygon.fromVertices(verts, { rounding: { radius: 1, smoothing: 2 } }),
    ).toThrow(RangeError);
  });

  test('rectangle needs positive dimensions', () => {
    for (const bad of [{ width: 0 }, { width: -1 }, { height: 0 }, { height: -1 }]) {
      expect(() => RoundedPolygon.rectangle(bad)).toThrow(RangeError);
    }
  });

  test('star and pillStar need at least 3 vertices per radius', () => {
    expect(() => RoundedPolygon.star(2)).toThrow(RangeError);
    expect(() => RoundedPolygon.pillStar({ numVerticesPerRadius: 2 })).toThrow(RangeError);
  });

  describe('fromFeatures', () => {
    test('needs two features', () => {
      expect(() => RoundedPolygon.fromFeatures([])).toThrow(RangeError);
      expect(() =>
        RoundedPolygon.fromFeatures([new PolygonFeature([Cubic.point(ORIGIN)], 'convex')]),
      ).toThrow(RangeError);
    });

    test('needs continuous features', () => {
      const cubic1 = Cubic.straightLine(ORIGIN, point(1, 0));
      const cubic2 = Cubic.straightLine(point(10, 10), point(20, 20));
      expect(() =>
        RoundedPolygon.fromFeatures([PolygonFeature.edge(cubic1), PolygonFeature.edge(cubic2)]),
      ).toThrow(RangeError);
    });

    test('rebuilds what it was taken from', () => {
      const bases = [
        RoundedPolygon.rectangle(),
        RoundedPolygon.rectangle({ rounding: { radius: 0.5, smoothing: 0.2 } }),
        RoundedPolygon.pill(),
        RoundedPolygon.pillStar({ rounding: { radius: 0.5, smoothing: 0.2 } }),
        ...Array.from({ length: 18 }, (_, i) => RoundedPolygon.circle({ numVertices: i + 3 })),
        ...Array.from({ length: 18 }, (_, i) => RoundedPolygon.star(i + 3)),
        ...Array.from({ length: 18 }, (_, i) =>
          RoundedPolygon.star(i + 3, { rounding: { radius: 0.5, smoothing: 0.2 } }),
        ),
      ];
      for (const base of bases) polygonsClose(RoundedPolygon.fromFeatures(base.features), base);
    });
  });

  test('computes its centre as the average of the vertices', () => {
    const polygon = RoundedPolygon.fromVertices([ORIGIN, point(1, 0), point(0, 1), point(1, 1)]);
    expect(polygon.center).toEqual(point(0.5, 0.5));
  });

  test('normalizing a polygon that has collapsed to a point gives no NaN', () => {
    const degenerate = RoundedPolygon.regular(4).transformed(() => [0.5, 0.5]);
    for (const cubic of degenerate.normalized().cubics) {
      expect(Number.isNaN(cubic.anchor0X) || Number.isNaN(cubic.control0Y)).toBe(false);
    }
  });

  test('normalized fits the unit square', () => {
    const bounds = RoundedPolygon.star(5).normalized().calculateBounds();
    expect(Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top)).toBeCloseTo(1, 3);
    expect(bounds.left).toBeGreaterThanOrEqual(-EPSILON);
    expect(bounds.top).toBeGreaterThanOrEqual(-EPSILON);
    expect(bounds.right).toBeLessThanOrEqual(1 + EPSILON);
    expect(bounds.bottom).toBeLessThanOrEqual(1 + EPSILON);
  });

  test('rounding space usage: a side gives its room to the roundings first', () => {
    const polygon = RoundedPolygon.fromVertices([ORIGIN, point(1, 0), point(0.5, 1)], {
      perVertexRounding: [{ radius: 1 }, { radius: 1, smoothing: 1 }, UNROUNDED],
    });
    const lowerEdge = polygon.features.find((f) => f.isEdge) as PolygonFeature;
    expect(lowerEdge.cubics.length).toBe(1);
    const edge = lowerEdge.cubics[0] as Cubic;
    close(edge.anchor0X, 0.5);
    close(edge.anchor0Y, 0);
    close(edge.anchor1X, 0.5);
    close(edge.anchor1Y, 0);
  });

  describe('uneven smoothing', () => {
    const POINTS = 20;
    const check = (
      rounding0: CornerRounding,
      expectedV0SX: number,
      expectedV0SY: number,
      expectedV3SY: number,
      rounding3: CornerRounding = { radius: 0.5 },
    ) => {
      const polygon = RoundedPolygon.fromVertices([ORIGIN, point(5, 0), point(5, 1), point(0, 1)], {
        perVertexRounding: [rounding0, UNROUNDED, UNROUNDED, rounding3],
      });
      const edges = polygon.features.filter((f) => f.isEdge);
      const e01 = (edges[0] as PolygonFeature).cubics[0] as Cubic;
      const e30 = (edges[3] as PolygonFeature).cubics[0] as Cubic;
      close(e01.anchor0X, expectedV0SX);
      close(e30.anchor1Y, expectedV0SY);
      close(1 - e30.anchor0Y, expectedV3SY);
    };

    test('1', () => {
      for (let i = 0; i <= POINTS; i++) {
        const smooth = i / POINTS;
        check(
          { radius: 0.4, smoothing: smooth },
          0.4 * (1 + smooth),
          Math.min(0.4 * (1 + smooth), 0.5),
          0.5,
        );
      }
    });

    test('2', () => {
      for (let i = 0; i <= POINTS; i++) {
        const smooth = i / POINTS;
        const smoothWantedV0 = 0.4 * smooth;
        const smoothWantedV3 = 0.2;
        const factor = Math.min(0.4 / (smoothWantedV0 + smoothWantedV3), 1);
        check(
          { radius: 0.4, smoothing: smooth },
          0.4 * (1 + smooth),
          0.4 + factor * smoothWantedV0,
          0.2 + factor * smoothWantedV3,
          { radius: 0.2, smoothing: 1 },
        );
      }
    });

    test('3', () => {
      for (let i = 0; i <= POINTS; i++) {
        const smooth = i / POINTS;
        check({ radius: 0.4, smoothing: smooth }, 0.4 * (1 + smooth), 0.4, 0.6, { radius: 0.6 });
      }
    });
  });

  test('a shape made at full size is the canonical one, scaled', () => {
    const radius = 400;
    const innerRadiusFactor = 0.35;
    const roundingFactor = 0.32;
    const fullSize = RoundedPolygon.star(4, {
      radius,
      innerRadius: radius * innerRadiusFactor,
      rounding: { radius: radius * roundingFactor },
      innerRounding: { radius: radius * roundingFactor },
      center: point(radius, radius),
    }).transformed((x, y) => [(x - radius) / radius, (y - radius) / radius]);
    const canonical = RoundedPolygon.star(4, {
      innerRadius: innerRadiusFactor,
      rounding: { radius: roundingFactor },
      innerRounding: { radius: roundingFactor },
    });
    cubicListsClose(fullSize.cubics, canonical.cubics);
  });

  test('bounds: the true bounds are tighter than the approximate ones, and max bounds hold any turn', () => {
    const square = RoundedPolygon.regular(4);
    const approx = square.calculateApproximateBounds();
    for (const bounds of [approx, square.calculateBounds()]) {
      close(bounds.left, -1);
      close(bounds.top, -1);
      close(bounds.right, 1);
      close(bounds.bottom, 1);
    }
    const rounded = RoundedPolygon.regular(4, { rounding: { radius: 0.2 } });
    const a = rounded.calculateApproximateBounds();
    const b = rounded.calculateBounds();
    expect(b.right - b.left).toBeLessThan(a.right - a.left);
    const pentagon = RoundedPolygon.regular(5);
    const p = pentagon.calculateApproximateBounds();
    const m = pentagon.calculateMaxBounds();
    expect(m.right - m.left).toBeGreaterThan(p.right - p.left);
  });

  test('transforming translates every point, and keeps contiguous anchors equal', () => {
    const square = RoundedPolygon.regular(4);
    cubicListsClose(square.transformed((x, y) => [x, y]).cubics, square.cubics);
    const moved = square.transformed((x, y) => [x + 1, y + 2]).cubics;
    square.cubics.forEach((c, i) => {
      pointsClose(
        point((moved[i] as Cubic).anchor0X, (moved[i] as Cubic).anchor0Y),
        point(c.anchor0X + 1, c.anchor0Y + 2),
      );
    });
    const poly = RoundedPolygon.regular(4, { rounding: { radius: 7 / 15 } }).transformed((x, y) => {
      const p = rotate(point(x, y), 45);
      return [p.x * 648 + 540, p.y * 648 + 1212];
    });
    poly.cubics.forEach((c, i) => {
      const next = poly.cubics[(i + 1) % poly.cubics.length] as Cubic;
      expect(c.anchor1X).toBe(next.anchor0X);
      expect(c.anchor1Y).toBe(next.anchor0Y);
    });
  });

  test('its features hold the same non-empty cubics as the outline', () => {
    const square = RoundedPolygon.regular(4);
    const nonZero = square.features.flatMap((f) => f.cubics).filter((c) => !c.isZeroLength);
    cubicListsClose(square.cubics, nonZero);
  });

  test('a polygon with no size has one cubic with no length, and keeps it when transformed', () => {
    const poly = RoundedPolygon.regular(6, { radius: 0, rounding: { radius: 0.1 } });
    expect(poly.cubics.length).toBe(1);
    const still = poly.transformed((x, y) => [x * 10, y * 20]);
    expect(still.cubics.length).toBe(1);
    expect((still.cubics[0] as Cubic).isZeroLength).toBe(true);
  });

  test('a repeated vertex makes no extra curve', () => {
    const poly1 = RoundedPolygon.fromVertices([ORIGIN, point(1, 0), point(1, 0), point(0, 1)]);
    const poly2 = RoundedPolygon.fromVertices([ORIGIN, point(1, 0), point(0, 1)]);
    cubicListsClose(poly1.cubics, poly2.cubics);
  });
});

describe('shape builders', () => {
  const EPS = 0.01;
  const radiusClose = (p: Point, r1: number, r2 = r1, center: Point = ORIGIN) => {
    const d = distance(subtract(p, center));
    expect(Math.min(Math.abs(d - r1), Math.abs(d - r2))).toBeLessThan(EPS);
  };

  test('circle', () => {
    expect(() => RoundedPolygon.circle({ numVertices: 2 })).toThrow(RangeError);
    const cases: [RoundedPolygon, number, Point][] = [
      [RoundedPolygon.circle(), 1, ORIGIN],
      [RoundedPolygon.circle({ numVertices: 3 }), 1, ORIGIN],
      [RoundedPolygon.circle({ numVertices: 20 }), 1, ORIGIN],
      [RoundedPolygon.circle({ radius: 3 }), 3, ORIGIN],
      [RoundedPolygon.circle({ center: point(1, 2) }), 1, point(1, 2)],
    ];
    for (const [circle, radius, center] of cases) {
      for (const cubic of circle.cubics) {
        for (let t = 0; t <= 1; t += 0.1) {
          expect(Math.abs(distance(subtract(cubic.pointAt(t), center)) - radius)).toBeLessThan(EPS);
        }
      }
    }
  });

  test('star', () => {
    for (const [star, r, ir, center] of [
      [RoundedPolygon.star(4), 1, 0.5, ORIGIN],
      [RoundedPolygon.star(4, { innerRadius: 0.5, center: point(1, 2) }), 1, 0.5, point(1, 2)],
      [RoundedPolygon.star(4, { radius: 4, innerRadius: 2 }), 4, 2, ORIGIN],
    ] as const) {
      for (const cubic of star.cubics) {
        radiusClose(cubic.anchor0, r, ir, center);
        radiusClose(cubic.anchor1, r, ir, center);
      }
    }
  });

  test('a rounded star stays inside the unit box', () => {
    const rounding = { radius: 0.1 };
    const innerRounding = { radius: 0.2 };
    const perVtx = [
      rounding,
      innerRounding,
      rounding,
      innerRounding,
      rounding,
      innerRounding,
      rounding,
      innerRounding,
    ];
    for (const star of [
      RoundedPolygon.star(4, { rounding }),
      RoundedPolygon.star(4, { innerRounding }),
      RoundedPolygon.star(4, { rounding, innerRounding }),
      RoundedPolygon.star(4, { perVertexRounding: perVtx }),
    ]) {
      inBounds(star.cubics, point(-1, -1), point(1, 1));
    }
    expect(() => RoundedPolygon.star(6, { perVertexRounding: perVtx })).toThrow(RangeError);
  });
});

describe('DoubleMapper', () => {
  const validate = (mapper: DoubleMapper, expected: (x: number) => number) => {
    for (let i = 0; i < 10000; i++) {
      const source = i / 10000;
      const target = expected(source);
      close(mapper.map(source), target);
      close(mapper.mapBack(target), source);
    }
  };

  test('identity', () => validate(DoubleMapper.identity(), (x) => x));
  test('simple', () =>
    validate(
      new DoubleMapper([
        [0, 0],
        [0.5, 0.25],
      ]),
      (x) => (x < 0.5 ? x / 2 : (3 * x - 1) / 2),
    ));
  test('target wraps', () =>
    validate(
      new DoubleMapper([
        [0, 0.5],
        [0.1, 0.6],
      ]),
      (x) => (x + 0.5) % 1,
    ));
  test('source wraps', () =>
    validate(
      new DoubleMapper([
        [0.5, 0],
        [0.1, 0.6],
      ]),
      (x) => (x + 0.5) % 1,
    ));
  test('both wrap', () =>
    validate(
      new DoubleMapper([
        [0.5, 0.5],
        [0.75, 0.75],
        [0.1, 0.1],
        [0.49, 0.49],
      ]),
      (x) => x,
    ));
  test('multiple points', () =>
    validate(
      new DoubleMapper([
        [0.4, 0.2],
        [0.5, 0.22],
        [0, 0.8],
      ]),
      (x) => (x < 0.4 ? (0.8 + x) % 1 : x < 0.5 ? 0.2 + (x - 0.4) / 5 : 0.22 + (x - 0.5) * 1.16),
    ));
  test('a target that wraps twice is rejected', () => {
    expect(
      () =>
        new DoubleMapper([
          [0, 0],
          [0.3, 0.6],
          [0.6, 0.3],
          [0.9, 0.9],
        ]),
    ).toThrow(RangeError);
  });
  test('a source that wraps twice is rejected', () => {
    expect(
      () =>
        new DoubleMapper([
          [0, 0],
          [0.6, 0.3],
          [0.3, 0.6],
          [0.9, 0.9],
        ]),
    ).toThrow(RangeError);
  });
});

describe('measuring', () => {
  const measurer = new LengthMeasurer();

  const irregular = (polygon: RoundedPolygon, extra?: (m: MeasuredPolygon) => void) => {
    const measured = MeasuredPolygon.measure(measurer, polygon);
    expect(measured.first.startOutlineProgress).toBe(0);
    expect(measured.last.endOutlineProgress).toBe(1);
    for (let i = 0; i < measured.length; i++) {
      if (i > 0)
        expect(measured.at(i - 1).endOutlineProgress).toBe(measured.at(i).startOutlineProgress);
      expect(measured.at(i).endOutlineProgress).toBeGreaterThanOrEqual(
        measured.at(i).startOutlineProgress,
      );
    }
    for (const f of measured.features) {
      expect(f.progress).toBeGreaterThanOrEqual(0);
      expect(f.progress).toBeLessThan(1);
    }
    extra?.(measured);
  };

  test.each([3, 5, 8, 12, 20])('a sharp regular polygon of %i sides has equal parts', (sides) => {
    irregular(RoundedPolygon.regular(sides), (m) => {
      expect(m.length).toBe(sides);
      for (let i = 0; i < m.length; i++) close(m.at(i).startOutlineProgress, i / sides);
    });
  });

  test.each([0.15, 0.5, 1])('measures a hexagon rounded by %f', (radius) => {
    irregular(RoundedPolygon.regular(6, { rounding: { radius } }));
  });

  test('measures a circle to within 1.5% of 2π', () => {
    const circle = RoundedPolygon.circle({ numVertices: 4 });
    const length = circle.cubics.reduce((sum, c) => sum + measurer.measureCubic(c), 0);
    expect(Math.abs(length - 2 * Math.PI)).toBeLessThan(0.015 * 2 * Math.PI);
  });

  test('measures an hour glass by the length of each side', () => {
    const polygon = RoundedPolygon.fromVertices([
      ORIGIN,
      point(1, 1),
      point(-1, 1),
      ORIGIN,
      point(-1, -1),
      point(1, -1),
    ]);
    const diagonal = Math.SQRT2;
    const total = 4 * diagonal + 2 * 2;
    const expected = [diagonal, 2, diagonal, diagonal, 2, diagonal].map((l) => l / total);
    irregular(polygon, (m) => {
      expect(m.length).toBe(expected.length);
      expected.forEach((e, i) => {
        close(m.at(i).endOutlineProgress - m.at(i).startOutlineProgress, e);
      });
    });
  });

  test('measures irregular shapes', () => {
    irregular(
      RoundedPolygon.fromVertices([point(0, -1), point(1, 1), point(0, 0.5), point(-1, 1)], {
        perVertexRounding: [
          { radius: 0.2, smoothing: 0.5 },
          { radius: 0.2, smoothing: 0.5 },
          { radius: 0.4 },
          { radius: 0.2, smoothing: 0.5 },
        ],
      }),
    );
    irregular(
      RoundedPolygon.fromVertices([point(-1, -1), point(1, -1), point(1, 1), point(-1, 1)], {
        perVertexRounding: [UNROUNDED, UNROUNDED, { radius: 0.5, smoothing: 0.5 }, UNROUNDED],
      }),
    );
  });

  test('copes with an empty feature last', () => {
    irregular(
      RoundedPolygon.fromFeatures([
        PolygonFeature.convexCorner([Cubic.straightLine(ORIGIN, point(1, 1))]),
        PolygonFeature.convexCorner([Cubic.straightLine(point(1, 1), point(1, 0))]),
        PolygonFeature.convexCorner([Cubic.straightLine(point(1, 0), ORIGIN)]),
        PolygonFeature.convexCorner([Cubic.straightLine(ORIGIN, ORIGIN)]),
      ]),
    );
  });

  test('spaces the cubics of a polygon with no perimeter evenly', () => {
    irregular(RoundedPolygon.regular(4, { radius: 0 }), (m) => {
      for (let i = 0; i < m.length; i++) {
        close(m.at(i).endOutlineProgress - m.at(i).startOutlineProgress, 1 / m.length);
      }
    });
  });

  test('cutAndShift keeps a cubic that ends a rounding error before the cut', () => {
    const measured = MeasuredPolygon.measure(measurer, RoundedPolygon.regular(3));
    const boundary = measured.at(0).endOutlineProgress;
    const cut = boundary + 1e-16;
    expect(cut).toBeGreaterThan(boundary);
    expect(positiveModulo(boundary - cut, 1)).toBe(0);
    const shifted = measured.cutAndShift(cut);
    expect(shifted.length).toBe(3);
    cubicsClose(shifted.at(0).cubic, measured.at(1).cubic);
    cubicsClose(shifted.at(1).cubic, measured.at(2).cubic);
    cubicsClose(shifted.at(2).cubic, measured.at(0).cubic);
    for (let i = 0; i < shifted.length; i++) {
      close(shifted.at(i).endOutlineProgress - shifted.at(i).startOutlineProgress, 1 / 3);
    }
  });

  test('a cut at measure 0 is at the start of the curve', () => {
    expect(measurer.findCubicCutPoint(Cubic.point(ORIGIN), 0)).toBe(0);
    expect(measurer.findCubicCutPoint(Cubic.straightLine(ORIGIN, point(1, 0)), 0)).toBe(0);
  });
});

describe('feature mapping', () => {
  const triangleWithRoundings = RoundedPolygon.regular(3, { rounding: { radius: 0.2 } });
  const triangle = RoundedPolygon.regular(3);
  const square = RoundedPolygon.regular(4);
  const squareRotated = RoundedPolygon.regular(4).transformed(rotator(45));

  const verifyMapping = (
    p1: RoundedPolygon,
    p2: RoundedPolygon,
    validator: (distances: number[]) => void,
  ) => {
    const f1 = MeasuredPolygon.measure(new LengthMeasurer(), p1).features;
    const f2 = MeasuredPolygon.measure(new LengthMeasurer(), p2).features;
    const distances = doMapping(f1, f2).map(([progress1, progress2]) =>
      featureDistSquared(
        (f1.find((f) => f.progress === progress1) as ProgressableFeature).feature,
        (f2.find((f) => f.progress === progress2) as ProgressableFeature).feature,
      ),
    );
    distances.sort((a, b) => b - a);
    validator(distances);
  };

  test('two triangles map their corners to each other', () => {
    verifyMapping(triangleWithRoundings, triangle, (distances) => {
      for (const d of distances) expect(d).toBeLessThan(0.1);
    });
  });

  test('triangle to square', () => {
    verifyMapping(triangle, square, (distances) => {
      expect(distances.length).toBe(3);
      close(distances[0] as number, distances[1] as number);
      expect(distances[0]).toBeLessThan(0.3);
      expect(distances[2]).toBeLessThan(1e-6);
    });
  });

  test('square to triangle', () => {
    verifyMapping(square, triangle, (distances) => {
      expect(distances.length).toBe(3);
      close(distances[0] as number, distances[1] as number);
      expect(distances[0]).toBeLessThan(0.3);
      expect(distances[2]).toBeLessThan(1e-6);
    });
  });

  test('a turned square to a triangle', () => {
    verifyMapping(squareRotated, triangle, (distances) => {
      expect(distances.length).toBe(3);
      expect(distances[0]).toBeGreaterThan(0.5);
      close(distances[1] as number, distances[2] as number);
      expect(distances[2]).toBeLessThan(0.1);
    });
  });

  test('a checkmark to a sun does not fail', () => {
    const checkmark = RoundedPolygon.fromVertices([
      point(400, -304),
      point(240, -464),
      point(296, -520),
      point(400, -416),
      point(664, -680),
      point(720, -624),
      point(400, -304),
    ]).normalized();
    const verySunny = RoundedPolygon.star(8, {
      innerRadius: 0.65,
      rounding: { radius: 0.15 },
    }).normalized();
    verifyMapping(checkmark, verySunny, (distances) => {
      expect(distances.length).toBe(6);
      expect(distances[0]).toBeLessThan(0.15);
    });
  });

  test('survives all but one candidate pair being rejected', () => {
    const corner1 = PolygonFeature.convexCorner([Cubic.straightLine(ORIGIN, point(0.1, 0))]);
    const corner2 = PolygonFeature.convexCorner([Cubic.straightLine(point(1, 1), point(1.1, 1))]);
    const features1 = [
      { progress: 0, feature: corner1 },
      { progress: 0.000001, feature: corner2 },
    ];
    const features2 = [
      { progress: 0, feature: corner1 },
      { progress: 0.5, feature: corner2 },
    ];
    expect(doMapping(features1, features2).length).toBe(2);
    expect(() => featureMapper(features1, features2)).not.toThrow();
  });

  test('skips a second feature at exactly the same progress', () => {
    const corner1 = PolygonFeature.convexCorner([Cubic.point(ORIGIN)]);
    const corner2 = PolygonFeature.convexCorner([Cubic.point(ORIGIN)]);
    const corner3 = PolygonFeature.convexCorner([Cubic.straightLine(point(1, 1), point(1.1, 1))]);
    const features1 = [
      { progress: 0, feature: corner1 },
      { progress: 0, feature: corner2 },
      { progress: 0.5, feature: corner3 },
    ];
    const features2 = [
      { progress: 0, feature: corner1 },
      { progress: 0.25, feature: corner2 },
      { progress: 0.5, feature: corner3 },
    ];
    expect(doMapping(features1, features2)).toEqual([
      [0, 0],
      [0.5, 0.5],
    ]);
    expect(() => featureMapper(features1, features2)).not.toThrow();
  });
});

describe('Morph', () => {
  const poly1 = RoundedPolygon.regular(3, { center: point(0.5, 0.5) });
  const poly2 = RoundedPolygon.regular(4, { center: point(0.5, 0.5) });

  test('at 0 a morph from a shape to itself is that shape', () => {
    const cubics = new Morph(poly1, poly1).toCubics(0);
    expect(cubics.length).toBeGreaterThan(0);
    for (const morphCubic of cubics) {
      expect(
        poly1.cubics.some((c) => {
          try {
            cubicsClose(morphCubic, c);
            return true;
          } catch {
            return false;
          }
        }),
      ).toBe(true);
    }
  });

  test('its ends are its shapes, drawn the same', () => {
    const morph = new Morph(poly1, poly2);
    // The morph splits curves so both shapes have as many as each other, which does not change
    // what is drawn: sample the outline instead of comparing curves.
    const sample = (cubics: readonly Cubic[]) =>
      cubics.flatMap((c) => [0, 0.25, 0.5, 0.75].map((t) => c.pointAt(t)));
    const dense = (cubics: readonly Cubic[]) => {
      const points = sample(cubics);
      return (p: Point) => Math.min(...points.map((q) => distance(subtract(p, q))));
    };
    for (const [progress, shape] of [
      [0, poly1],
      [1, poly2],
    ] as const) {
      const nearest = dense(morph.toCubics(progress));
      for (const c of shape.cubics)
        for (const t of [0, 0.5]) expect(nearest(c.pointAt(t))).toBeLessThan(0.05);
    }
  });

  test('a polygon with no perimeter morphs, and stays finite', () => {
    const morph = new Morph(RoundedPolygon.regular(4, { radius: 0 }), poly2);
    for (const cubic of morph.toCubics(0)) cubicsClose(cubic, Cubic.point(ORIGIN));
    for (const cubic of morph.toCubics(0.5)) expect(finite(cubic)).toBe(true);
    const bounds = poly2.calculateBounds();
    inBounds(morph.toCubics(1), point(bounds.left, bounds.top), point(bounds.right, bounds.bottom));
  });

  test('a polygon with repeated vertices morphs, and stays finite', () => {
    const vertices = [ORIGIN, ORIGIN, point(1, 0), point(1, 1), point(0, 1)];
    const star = RoundedPolygon.star(4, { center: point(0.5, 0.5) });
    for (const polygon of [
      RoundedPolygon.fromVertices(vertices),
      RoundedPolygon.fromVertices(vertices, { rounding: { radius: 0.2 } }),
    ]) {
      const morph = new Morph(polygon, star);
      for (const progress of [0, 0.5, 1]) {
        for (const cubic of morph.toCubics(progress)) expect(finite(cubic)).toBe(true);
      }
    }
  });

  test('exposes the shapes it morphs between', () => {
    const morph = new Morph(poly1, poly2);
    expect(morph.start).toBe(poly1);
    expect(morph.end).toBe(poly2);
  });

  test('toSvgPath is a closed path of as many curves as the morph has', () => {
    const morph = new Morph(poly1, poly2);
    const d = morph.toSvgPath(0.5);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.split('C').length - 1).toBe(morph.toCubics(0.5).length);
    expect(cubicsToPath([])).toBe('');
  });
});

describe('the catalogue', () => {
  test('has the 35 shapes, each in the unit square', () => {
    expect(shapeNames.length).toBe(35);
    for (const name of shapeNames) {
      const bounds = shapes[name].calculateBounds();
      expect(bounds.left, name).toBeGreaterThanOrEqual(-0.02);
      expect(bounds.top, name).toBeGreaterThanOrEqual(-0.02);
      expect(bounds.right, name).toBeLessThanOrEqual(1.02);
      expect(bounds.bottom, name).toBeLessThanOrEqual(1.02);
      // Normalized by the control points, so the outline itself can come up a little short.
      expect(
        Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top),
        name,
      ).toBeGreaterThan(0.8);
    }
  });

  test('builds a shape once', () => {
    expect(shapes.heart).toBe(shapes.heart);
    expect(Object.keys(shapes)).toEqual([...shapeNames]);
  });

  test('a morph between any two shapes has no gap in its outline', () => {
    for (const start of shapeNames) {
      for (const end of shapeNames) {
        const morph = new Morph(shapes[start], shapes[end]);
        for (const progress of [0, 0.5, 1]) {
          const cubics = morph.toCubics(progress);
          cubics.forEach((cubic, i) => {
            const previous = cubics[(i + cubics.length - 1) % cubics.length] as Cubic;
            expect(
              distance(subtract(cubic.anchor0, previous.anchor1)),
              `${start} to ${end} jumps before curve ${i} at ${progress}`,
            ).toBeLessThan(1e-4);
          });
        }
      }
    }
  });
});
