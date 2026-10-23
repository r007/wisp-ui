/**
 * A polygon whose corners are rounded, drawn as cubic Béziers.
 *
 * Adapted from Flutter's `material_ui` shapes (`shapes/rounded_polygon.dart`,
 * `shapes/corner_rounding.dart`), Copyright 2013 The Flutter Authors, BSD-3-Clause, which is
 * itself a port of the AndroidX `graphics-shapes` library, Copyright 2022 The Android Open Source
 * Project, Apache-2.0.
 *
 * Changes from the original: static factory functions and option objects instead of Dart
 * constructors and named parameters; `cubicsToPath` makes an SVG path; no Flutter types.
 */

import { Cubic } from './cubic.js';
import { PolygonFeature } from './features.js';
import {
  add,
  type Bounds,
  DISTANCE_EPSILON,
  distance,
  distanceSquared,
  divide,
  dot,
  interpolate,
  isConvex,
  lerp,
  ORIGIN,
  type Point,
  type PointTransformer,
  point,
  radialToCartesian,
  rotate90,
  scale,
  square,
  subtract,
  unionBounds,
  unit,
} from './math.js';

/**
 * How much a vertex is rounded: the `radius` of the circle that forms the corner, and the
 * `smoothing` (0 to 1) by which the curve is extended from that arc out to the edges. With 0 the
 * corner is a plain circular arc; with 1 there is no arc, and the two flanking curves meet in the
 * middle.
 */
export interface CornerRounding {
  readonly radius: number;
  readonly smoothing?: number;
}

/** A sharp corner. */
export const UNROUNDED: CornerRounding = { radius: 0, smoothing: 0 };

function checkRounding({ radius, smoothing = 0 }: CornerRounding) {
  if (!(radius >= 0)) throw new RangeError('radius has to be greater than or equal to zero');
  if (!(smoothing >= 0 && smoothing <= 1))
    throw new RangeError('smoothing has to be in range [0, 1]');
}

export interface PolygonOptions {
  /** Distance from the centre to each vertex. Default 1. */
  radius?: number;
  center?: Point;
  /** Rounding for every corner. Default sharp. */
  rounding?: CornerRounding;
  /** A rounding per vertex, which wins over `rounding`. */
  perVertexRounding?: readonly CornerRounding[];
}

export interface StarOptions {
  radius?: number;
  /** Distance from the centre to the inner vertices. Default 0.5. */
  innerRadius?: number;
  center?: Point;
  rounding?: CornerRounding;
  /** Rounding for the inner vertices; the outer ones use `rounding`. */
  innerRounding?: CornerRounding;
  perVertexRounding?: readonly CornerRounding[];
}

export interface PillStarOptions {
  width?: number;
  height?: number;
  numVerticesPerRadius?: number;
  innerRadiusRatio?: number;
  rounding?: CornerRounding;
  innerRounding?: CornerRounding;
  perVertexRounding?: readonly CornerRounding[];
  /** Where on the end caps the vertices sit: 0 spaces the inner ones evenly, 1 the outer. */
  vertexSpacing?: number;
  /** Where on the outline (0 to 1) the first vertex goes. */
  startLocation?: number;
  center?: Point;
}

/**
 * A closed outline made of corner and edge features, and so of cubic Béziers. Immutable. Build
 * one with a static factory, transform it, `normalized()` it into the unit square, and turn it
 * into a path with {@link cubicsToPath}, or morph it into another with `Morph`.
 */
export class RoundedPolygon {
  readonly features: readonly PolygonFeature[];
  readonly center: Point;
  readonly cubics: readonly Cubic[];

  private constructor(features: readonly PolygonFeature[], center: Point) {
    this.features = features;
    this.center = center;
    this.cubics = buildCubics(features, center);
    let prev = this.cubics[this.cubics.length - 1] as Cubic;
    for (const cubic of this.cubics) {
      if (
        Math.abs(cubic.anchor0X - prev.anchor1X) > DISTANCE_EPSILON ||
        Math.abs(cubic.anchor0Y - prev.anchor1Y) > DISTANCE_EPSILON
      ) {
        throw new RangeError(
          'RoundedPolygon must be contiguous, with the anchor points of all curves matching ' +
            'the anchor points of the preceding and succeeding cubics.',
        );
      }
      prev = cubic;
    }
  }

  /** A regular polygon with `numVertices` vertices. */
  static regular(numVertices: number, options: PolygonOptions = {}): RoundedPolygon {
    const { radius = 1, center = ORIGIN, rounding = UNROUNDED, perVertexRounding } = options;
    if (numVertices < 3) throw new RangeError('numVertices must be at least 3.');
    return RoundedPolygon.fromVertices(verticesFromNumVerts(numVertices, radius, center), {
      rounding,
      perVertexRounding,
      center,
    });
  }

  /**
   * A polygon through `vertices`, in order, each rounded as given. The centre defaults to the
   * average of the vertices.
   */
  static fromVertices(
    vertices: readonly Point[],
    {
      rounding = UNROUNDED,
      perVertexRounding,
      center,
    }: {
      rounding?: CornerRounding;
      perVertexRounding?: readonly CornerRounding[];
      center?: Point;
    } = {},
  ): RoundedPolygon {
    if (vertices.length < 3) throw new RangeError('Polygons must have at least 3 vertices.');
    if (perVertexRounding && perVertexRounding.length !== vertices.length) {
      throw new RangeError(
        'perVertexRounding list should be either null or the same size as the number of vertices.',
      );
    }
    checkRounding(rounding);
    for (const r of perVertexRounding ?? []) checkRounding(r);

    const n = vertices.length;
    const at = (i: number) => vertices[((i % n) + n) % n] as Point;
    const roundedCorners: RoundedCorner[] = [];
    for (let i = 0; i < n; i++) {
      roundedCorners.push(
        new RoundedCorner(at(i - 1), at(i), at(i + 1), perVertexRounding?.[i] ?? rounding),
      );
    }

    // For each side, check there is room for the cuts needed, and if not split the room: first
    // for rounding, then for smoothing if there is any left. Side i runs from corner i to corner
    // i + 1, and its pair is how much of the round cut and of the full cut we can do.
    const cutAdjusts = roundedCorners.map((corner, ix) => {
      const next = roundedCorners[(ix + 1) % n] as RoundedCorner;
      const expectedRoundCut = corner.expectedRoundCut + next.expectedRoundCut;
      const expectedCut = corner.expectedCut + next.expectedCut;
      const sideSize = distance(subtract(at(ix), at(ix + 1)));
      // Fulfil the rounding of both corners before spending room on smoothing.
      if (expectedRoundCut > sideSize) return [sideSize / expectedRoundCut, 0] as const;
      if (expectedCut > sideSize) {
        return [1, (sideSize - expectedRoundCut) / (expectedCut - expectedRoundCut)] as const;
      }
      return [1, 1] as const;
    });

    // The cubics for each (possibly) rounded corner.
    const corners: Cubic[][] = [];
    for (let i = 0; i < n; i++) {
      const corner = roundedCorners[i] as RoundedCorner;
      // allowedCuts[0] is for the side from the previous corner to this one, [1] for the side
      // from this corner to the next.
      const allowedCuts = [0, 1].map((delta) => {
        const [roundCutRatio, cutRatio] = cutAdjusts[(i + n - 1 + delta) % n] as readonly [
          number,
          number,
        ];
        return (
          corner.expectedRoundCut * roundCutRatio +
          (corner.expectedCut - corner.expectedRoundCut) * cutRatio
        );
      });
      corners.push(corner.getCubics(allowedCuts[0] as number, allowedCuts[1] as number));
    }

    // The corners, and the straight edges between them.
    const features: PolygonFeature[] = [];
    for (let i = 0; i < n; i++) {
      const convex = isConvex(at(i - 1), at(i), at(i + 1));
      const cornerCubics = corners[i] as Cubic[];
      const nextCorner = corners[(i + 1) % n] as Cubic[];
      features.push(
        new PolygonFeature(cornerCubics, convex ? 'convex' : 'concave'),
        PolygonFeature.edge(
          Cubic.straightLine(
            (cornerCubics[cornerCubics.length - 1] as Cubic).anchor1,
            (nextCorner[0] as Cubic).anchor0,
          ),
        ),
      );
    }
    return RoundedPolygon.fromFeatures(features, center ?? calculateCenter(vertices));
  }

  /** A circle approximated with `numVertices` rounded vertices (default 8). */
  static circle({
    numVertices = 8,
    radius = 1,
    center = ORIGIN,
  }: {
    numVertices?: number;
    radius?: number;
    center?: Point;
  } = {}): RoundedPolygon {
    if (numVertices < 3) throw new RangeError('Circle must have at least three vertices.');
    // Half the angle between two adjacent vertices, and the radius of the polygon that gives the
    // circle the requested radius.
    const theta = Math.PI / numVertices;
    return RoundedPolygon.regular(numVertices, {
      radius: radius / Math.cos(theta),
      center,
      rounding: { radius },
    });
  }

  /** A rectangle of `width` by `height` (default 2 by 2), its corners rounded as given. */
  static rectangle({
    width = 2,
    height = 2,
    rounding = UNROUNDED,
    perVertexRounding,
    center = ORIGIN,
  }: {
    width?: number;
    height?: number;
    rounding?: CornerRounding;
    perVertexRounding?: readonly CornerRounding[];
    center?: Point;
  } = {}): RoundedPolygon {
    if (width <= 0 || height <= 0) {
      throw new RangeError('Rectangles must have positive width and height.');
    }
    const left = center.x - width / 2;
    const top = center.y - height / 2;
    const right = center.x + width / 2;
    const bottom = center.y + height / 2;
    return RoundedPolygon.fromVertices(
      [point(right, bottom), point(left, bottom), point(left, top), point(right, top)],
      { rounding, perVertexRounding, center },
    );
  }

  /** A star with `numVerticesPerRadius` points. */
  static star(numVerticesPerRadius: number, options: StarOptions = {}): RoundedPolygon {
    const {
      radius = 1,
      innerRadius = 0.5,
      center = ORIGIN,
      rounding = UNROUNDED,
      innerRounding,
    } = options;
    let perVertexRounding = options.perVertexRounding;
    if (numVerticesPerRadius < 3) throw new RangeError('numVerticesPerRadius must be at least 3.');
    if (radius <= 0 || innerRadius <= 0)
      throw new RangeError('Star radii must both be greater than 0.');
    if (innerRadius >= radius) throw new RangeError('innerRadius must be less than radius.');

    // Asked for inner rounding but no per-vertex list: alternate outer and inner.
    if (!perVertexRounding && innerRounding) {
      perVertexRounding = Array.from({ length: numVerticesPerRadius }, () => [
        rounding,
        innerRounding,
      ]).flat();
    }
    return RoundedPolygon.fromVertices(
      starVerticesFromNumVerts(numVerticesPerRadius, radius, innerRadius, center),
      { rounding, perVertexRounding, center },
    );
  }

  /** A pill: a rectangle rounded as far as it goes. */
  static pill({
    width = 2,
    height = 1,
    smoothing = 0,
    center = ORIGIN,
  }: {
    width?: number;
    height?: number;
    smoothing?: number;
    center?: Point;
  } = {}): RoundedPolygon {
    if (width <= 0 || height <= 0)
      throw new RangeError('Pill shapes must have positive width and height.');
    const wHalf = width / 2;
    const hHalf = height / 2;
    return RoundedPolygon.fromVertices(
      [
        point(wHalf + center.x, hHalf + center.y),
        point(-wHalf + center.x, hHalf + center.y),
        point(-wHalf + center.x, -hHalf + center.y),
        point(wHalf + center.x, -hHalf + center.y),
      ],
      { rounding: { radius: Math.min(wHalf, hHalf), smoothing }, center },
    );
  }

  /** A star whose points are spread round a pill instead of a circle. */
  static pillStar(options: PillStarOptions = {}): RoundedPolygon {
    const {
      width = 2,
      height = 1,
      numVerticesPerRadius = 8,
      innerRadiusRatio = 0.5,
      rounding = UNROUNDED,
      innerRounding,
      vertexSpacing = 0.5,
      startLocation = 0,
      center = ORIGIN,
    } = options;
    let perVertexRounding = options.perVertexRounding;
    if (numVerticesPerRadius < 3) throw new RangeError('numVerticesPerRadius must be at least 3.');
    if (width <= 0 || height <= 0)
      throw new RangeError('Pill shapes must have positive width and height.');
    if (innerRadiusRatio <= 0 || innerRadiusRatio > 1) {
      throw new RangeError('innerRadiusRatio must be in (0, 1] range.');
    }
    if (vertexSpacing < 0 || vertexSpacing > 1)
      throw new RangeError('vertexSpacing must be in [0, 1] range.');
    if (startLocation < 0 || startLocation > 1)
      throw new RangeError('startLocation must be in [0, 1] range.');

    if (!perVertexRounding && innerRounding) {
      perVertexRounding = Array.from({ length: numVerticesPerRadius }, () => [
        rounding,
        innerRounding,
      ]).flat();
    }
    return RoundedPolygon.fromVertices(
      pillStarVerticesFromNumVerts(
        numVerticesPerRadius,
        width,
        height,
        innerRadiusRatio,
        vertexSpacing,
        startLocation,
        center,
      ),
      { rounding, perVertexRounding, center },
    );
  }

  /** A polygon from its features, which must be at least two. Without a centre, the vertices' average. */
  static fromFeatures(features: readonly PolygonFeature[], center?: Point): RoundedPolygon {
    if (features.length < 2) throw new RangeError('Polygons must have at least 2 features.');
    if (center) return new RoundedPolygon(features, center);
    const vertices: Point[] = [];
    for (const feature of features) {
      for (const cubic of feature.cubics) vertices.push(point(cubic.anchor0X, cubic.anchor0Y));
    }
    return new RoundedPolygon(features, calculateCenter(vertices));
  }

  /** A copy with `transformer` applied to every point, the centre included. */
  transformed(transformer: PointTransformer): RoundedPolygon {
    const [cx, cy] = transformer(this.center.x, this.center.y);
    return new RoundedPolygon(
      this.features.map((f) => f.transformed(transformer)),
      point(cx, cy),
    );
  }

  /** This scaled and moved to fit the unit square, centred in it on the shorter axis. */
  normalized(): RoundedPolygon {
    const bounds = this.calculateApproximateBounds();
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const side = Math.max(width, height);
    if (side < DISTANCE_EPSILON) return this;
    // Centre the shape if the bounds are not square.
    const offsetX = (side - width) / 2 - bounds.left;
    const offsetY = (side - height) / 2 - bounds.top;
    return this.transformed((x, y) => [(x + offsetX) / side, (y + offsetY) / side]);
  }

  /**
   * The square, centred on the polygon's centre, that holds the shape however it turns: its
   * half-side is the greatest distance from the centre to an anchor or to a curve's middle.
   */
  calculateMaxBounds(): Bounds {
    let maxDistSquared = 0;
    for (const cubic of this.cubics) {
      const anchorDistance = distanceSquared(subtract(cubic.anchor0, this.center));
      const middleDistance = distanceSquared(subtract(cubic.pointAt(0.5), this.center));
      maxDistSquared = Math.max(maxDistSquared, anchorDistance, middleDistance);
    }
    const reach = Math.sqrt(maxDistSquared);
    return {
      left: this.center.x - reach,
      top: this.center.y - reach,
      right: this.center.x + reach,
      bottom: this.center.y + reach,
    };
  }

  /** The tight bounding box of the outline. */
  calculateBounds(): Bounds {
    return this.bounds(false);
  }

  /** A cheaper bounding box, never smaller than {@link calculateBounds}. */
  calculateApproximateBounds(): Bounds {
    return this.bounds(true);
  }

  private bounds(approximate: boolean): Bounds {
    let bounds = (this.cubics[0] as Cubic).calculateBounds(approximate);
    for (let i = 1; i < this.cubics.length; i++) {
      bounds = unionBounds(bounds, (this.cubics[i] as Cubic).calculateBounds(approximate));
    }
    return bounds;
  }
}

/** The average of the points. */
export function calculateCenter(vertices: readonly Point[]): Point {
  let x = 0;
  let y = 0;
  for (const vertex of vertices) {
    x += vertex.x;
    y += vertex.y;
  }
  return point(x / vertices.length, y / vertices.length);
}

function buildCubics(features: readonly PolygonFeature[], center: Point): readonly Cubic[] {
  const cubics: Cubic[] = [];
  // The first and last cubic are joined at the end, so that the final anchor is exactly the first.
  // Anchors that are off by even much less than a pixel can show as rendering artefacts.
  let firstCubic: Cubic | undefined;
  let lastCubic: Cubic | undefined;
  let firstFeatureSplitStart: Cubic[] | undefined;
  let firstFeatureSplitEnd: Cubic[] | undefined;

  const firstFeature = features[0];
  if (firstFeature && firstFeature.cubics.length === 3) {
    // Split the middle cubic of the first feature in two, so the outline starts mid-corner.
    const [start, end] = (firstFeature.cubics[1] as Cubic).split(0.5);
    firstFeatureSplitStart = [firstFeature.cubics[0] as Cubic, start];
    firstFeatureSplitEnd = [end, firstFeature.cubics[2] as Cubic];
  }

  // Going one past the features lets the first feature's split-off start come last.
  for (let i = 0; i <= features.length; i++) {
    let featureCubics: readonly Cubic[];
    if (i === 0 && firstFeatureSplitEnd) featureCubics = firstFeatureSplitEnd;
    else if (i === features.length) {
      if (firstFeatureSplitStart) featureCubics = firstFeatureSplitStart;
      else break;
    } else featureCubics = (features[i] as PolygonFeature).cubics;

    for (const cubic of featureCubics) {
      // Zero-length curves add nothing and can cause rendering artefacts.
      if (!cubic.isZeroLength) {
        if (lastCubic) cubics.push(lastCubic);
        lastCubic = cubic;
        firstCubic ??= cubic;
      } else if (lastCubic) {
        // Dropping several nearly zero-length curves in a row can leave enough of a gap to fail
        // the continuity check later, even though the distances are tiny. So the last cubic
        // always takes the latest anchor.
        lastCubic = new Cubic(
          lastCubic.anchor0X,
          lastCubic.anchor0Y,
          lastCubic.control0X,
          lastCubic.control0Y,
          lastCubic.control1X,
          lastCubic.control1Y,
          cubic.anchor1X,
          cubic.anchor1Y,
        );
      }
    }
  }

  if (lastCubic && firstCubic) {
    cubics.push(
      new Cubic(
        lastCubic.anchor0X,
        lastCubic.anchor0Y,
        lastCubic.control0X,
        lastCubic.control0Y,
        lastCubic.control1X,
        lastCubic.control1Y,
        firstCubic.anchor0X,
        firstCubic.anchor0Y,
      ),
    );
  } else {
    // An empty polygon.
    cubics.push(Cubic.point(center));
  }
  return cubics;
}

/** The rounding of one corner, worked out from the vertex and its two neighbours. */
class RoundedCorner {
  private readonly p0: Point;
  private readonly p1: Point;
  private readonly p2: Point;
  private readonly d1: Point;
  private readonly d2: Point;
  private readonly cornerRadius: number;
  private readonly smoothing: number;
  readonly expectedRoundCut: number;

  constructor(p0: Point, p1: Point, p2: Point, rounding: CornerRounding) {
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    const v01 = subtract(p0, p1);
    const v21 = subtract(p2, p1);
    const d01 = distance(v01);
    const d21 = distance(v21);
    if (d01 > 0 && d21 > 0) {
      this.d1 = divide(v01, d01);
      this.d2 = divide(v21, d21);
      this.cornerRadius = rounding.radius;
      this.smoothing = rounding.smoothing ?? 0;
      // The cosine of the angle at p1 is the dot product of the unit vectors to the other two.
      const cosAngle = dot(this.d1, this.d2);
      const sinAngle = Math.sqrt(1 - square(cosAngle));
      // How much to cut from a side to get the radius, where the circle meets the edge. From
      // tan(A/2) = sinA / (1 + cosA) = radius / cut.
      this.expectedRoundCut = sinAngle > 1e-3 ? (this.cornerRadius * (cosAngle + 1)) / sinAngle : 0;
    } else {
      // One or both sides are empty: nothing to round.
      this.d1 = ORIGIN;
      this.d2 = ORIGIN;
      this.cornerRadius = 0;
      this.smoothing = 0;
      this.expectedRoundCut = 0;
    }
  }

  /** Smoothing changes the cut: 0 leaves it as it is, 1 doubles it. */
  get expectedCut(): number {
    return (1 + this.smoothing) * this.expectedRoundCut;
  }

  getCubics(allowedCut0: number, allowedCut1: number): Cubic[] {
    // The smaller of the cuts gives the radius; the room left on the other side can go to smoothing.
    const allowedCut = Math.min(allowedCut0, allowedCut1);

    // Nothing to do: a line, or a point.
    if (
      this.expectedRoundCut < DISTANCE_EPSILON ||
      allowedCut < DISTANCE_EPSILON ||
      this.cornerRadius < DISTANCE_EPSILON
    ) {
      return [Cubic.straightLine(this.p1, this.p1)];
    }

    // How much of the cut the rounding needs.
    const actualRoundCut = Math.min(allowedCut, this.expectedRoundCut);
    // One smoothing value per side. Rounding takes room first; smoothing gets what is left.
    const actualSmoothing0 = this.calculateActualSmoothingValue(allowedCut0);
    const actualSmoothing1 = this.calculateActualSmoothingValue(allowedCut1);
    const actualR = (this.cornerRadius * actualRoundCut) / this.expectedRoundCut;
    // The distance from the corner to the centre of the rounding arc, and that centre.
    const centerDistance = Math.sqrt(square(actualR) + square(actualRoundCut));
    const center = add(this.p1, scale(unit(divide(add(this.d1, this.d2), 2)), centerDistance));

    const circleIntersection0 = add(this.p1, scale(this.d1, actualRoundCut));
    const circleIntersection2 = add(this.p1, scale(this.d2, actualRoundCut));

    const flanking0 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing0,
      this.p1,
      this.p0,
      circleIntersection0,
      circleIntersection2,
      center,
      actualR,
    );
    const flanking2 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing1,
      this.p1,
      this.p2,
      circleIntersection2,
      circleIntersection0,
      center,
      actualR,
    ).reversed;

    return [flanking0, Cubic.circularArc(center, flanking0.anchor1, flanking2.anchor0), flanking2];
  }

  private calculateActualSmoothingValue(allowedCut: number): number {
    if (allowedCut > this.expectedCut) return this.smoothing;
    if (allowedCut > this.expectedRoundCut) {
      return (
        (this.smoothing * (allowedCut - this.expectedRoundCut)) /
        (this.expectedCut - this.expectedRoundCut)
      );
    }
    return 0;
  }

  private computeFlankingCurve(
    actualRoundCut: number,
    actualSmoothingValues: number,
    corner: Point,
    sideStart: Point,
    circleSegmentIntersection: Point,
    otherCircleSegmentIntersection: Point,
    circleCenter: Point,
    actualR: number,
  ): Cubic {
    const sideDirection = unit(subtract(sideStart, corner));
    const curveStart = add(
      corner,
      scale(sideDirection, actualRoundCut * (1 + actualSmoothingValues)),
    );
    // Cut a part of the circle section proportional to 1 - smoothing: all of it with 0, none
    // with 1.
    const p = interpolate(
      circleSegmentIntersection,
      divide(add(circleSegmentIntersection, otherCircleSegmentIntersection), 2),
      actualSmoothingValues,
    );
    // The flanking curve ends on the circle.
    const curveEnd = add(circleCenter, scale(unit(subtract(p, circleCenter)), actualR));
    // The anchor on the circle side is where the circle's tangent at that end meets the edge.
    const circleTangent = rotate90(subtract(curveEnd, circleCenter));
    const anchorEnd =
      lineIntersection(sideStart, sideDirection, curveEnd, circleTangent) ??
      circleSegmentIntersection;
    // The start anchor is a point 2/3 of the way, which seems to come from design tools.
    const anchorStart = divide(add(curveStart, scale(anchorEnd, 2)), 3);
    return Cubic.of(curveStart, anchorStart, anchorEnd, curveEnd);
  }
}

/** Where the line through `p0` along `d0` meets the one through `p1` along `d1`, if they do. */
function lineIntersection(p0: Point, d0: Point, p1: Point, d1: Point): Point | null {
  const rotatedD1 = rotate90(d1);
  const den = dot(d0, rotatedD1);
  // Parallel, or nearly.
  if (Math.abs(den) < DISTANCE_EPSILON) return null;
  const num = dot(subtract(p1, p0), rotatedD1);
  // Also check the relative size: (den / num) < epsilon, without the division.
  if (Math.abs(den) < DISTANCE_EPSILON * Math.abs(num)) return null;
  const k = num / den;
  return add(p0, scale(d0, k));
}

function verticesFromNumVerts(numVertices: number, radius: number, center: Point): Point[] {
  return Array.from({ length: numVertices }, (_, i) =>
    radialToCartesian(radius, (Math.PI / numVertices) * 2 * i, center),
  );
}

function starVerticesFromNumVerts(
  numVerticesPerRadius: number,
  radius: number,
  innerRadius: number,
  center: Point,
): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < numVerticesPerRadius; i++) {
    result.push(radialToCartesian(radius, (Math.PI / numVerticesPerRadius) * 2 * i, center));
    result.push(
      radialToCartesian(innerRadius, (Math.PI / numVerticesPerRadius) * (2 * i + 1), center),
    );
  }
  return result;
}

function pillStarVerticesFromNumVerts(
  numVerticesPerRadius: number,
  width: number,
  height: number,
  innerRadius: number,
  vertexSpacing: number,
  startLocation: number,
  center: Point,
): Point[] {
  // Take the perimeter of the pill outline, then the t of each vertex as we walk it. That says
  // where on the outline the vertex goes, which depends on its section: the vertical edges at the
  // sides, the circular sections on the four corners, or the horizontal edges top and bottom.
  // Either the vertical or the horizontal edges have no length (the smaller dimension is all
  // circular).
  const endcapRadius = Math.min(width, height);
  const vSegLen = Math.max(height - width, 0);
  const hSegLen = Math.max(width - height, 0);
  const vSegHalf = vSegLen / 2;
  const hSegHalf = hSegLen / 2;

  // vertexSpacing places the vertices on the end caps. 0 spaces the inner vertices like those
  // along the edges, which pushes the outer ones further apart; 1 does the reverse.
  const circlePerimeter = Math.PI * 2 * endcapRadius * lerp(innerRadius, 1, vertexSpacing);
  // The circle plus the horizontal and vertical sections of the inner rectangle, whether or not
  // they have length.
  const perimeter = 2 * hSegLen + 2 * vSegLen + circlePerimeter;

  // Where each section of the outline starts, as a t.
  const sections = new Array<number>(11).fill(0);
  sections[1] = vSegLen / 2;
  sections[2] = sections[1] + circlePerimeter / 4;
  sections[3] = sections[2] + hSegLen;
  sections[4] = sections[3] + circlePerimeter / 4;
  sections[5] = sections[4] + vSegLen;
  sections[6] = sections[5] + circlePerimeter / 4;
  sections[7] = sections[6] + hSegLen;
  sections[8] = sections[7] + circlePerimeter / 4;
  sections[9] = sections[8] + vSegLen / 2;
  sections[10] = perimeter;

  // The vertices are evenly spaced along the contour.
  const tPerVertex = perimeter / (2 * numVerticesPerRadius);

  // Inner and outer are placed in turn, unlike the other shapes, because they can land in
  // different quadrants and need a calculation each.
  let inner = false;
  let currSecIndex = 0;
  let secStart = 0;
  let secEnd = sections[1] as number;
  // 0 is on the positive x axis, moving into section 0; startLocation (0 to 1) moves it around.
  let t = startLocation * perimeter;

  const result: Point[] = [];
  const rectBR = point(hSegHalf, vSegHalf);
  const rectBL = point(-hSegHalf, vSegHalf);
  const rectTL = point(-hSegHalf, -vSegHalf);
  const rectTR = point(hSegHalf, -vSegHalf);

  for (let i = 0; i < numVerticesPerRadius * 2; i++) {
    // t may start (and end) past 0: bound it so that crossing 0 again does the right thing.
    const boundedT = t % perimeter;
    if (boundedT < secStart) {
      currSecIndex = 0;
      secStart = 0;
      secEnd = sections[1] as number;
    }
    while (boundedT >= (sections[(currSecIndex + 1) % sections.length] as number)) {
      currSecIndex = (currSecIndex + 1) % sections.length;
      secStart = sections[currSecIndex] as number;
      secEnd = sections[(currSecIndex + 1) % sections.length] as number;
    }

    // How far into its section the vertex is, as a proportion of the section's length.
    const tProportion = (boundedT - secStart) / (secEnd - secStart);

    // On an end cap the proportion gives the angle round the cap, added to the section's start
    // angle; on an edge it is a straight linear placement.
    const currRadius = inner ? endcapRadius * innerRadius : endcapRadius;
    let vertex: Point;
    switch (currSecIndex) {
      case 0:
        vertex = point(currRadius, tProportion * vSegHalf);
        break;
      case 1:
        vertex = add(radialToCartesian(currRadius, (tProportion * Math.PI) / 2), rectBR);
        break;
      case 2:
        vertex = point(hSegHalf - tProportion * hSegLen, currRadius);
        break;
      case 3:
        vertex = add(
          radialToCartesian(currRadius, Math.PI / 2 + (tProportion * Math.PI) / 2),
          rectBL,
        );
        break;
      case 4:
        vertex = point(-currRadius, vSegHalf - tProportion * vSegLen);
        break;
      case 5:
        vertex = add(radialToCartesian(currRadius, Math.PI + (tProportion * Math.PI) / 2), rectTL);
        break;
      case 6:
        vertex = point(-hSegHalf + tProportion * hSegLen, -currRadius);
        break;
      case 7:
        vertex = add(
          radialToCartesian(currRadius, Math.PI * 1.5 + (tProportion * Math.PI) / 2),
          rectTR,
        );
        break;
      default:
        vertex = point(currRadius, -vSegHalf + tProportion * vSegHalf);
    }
    result.push(add(vertex, center));
    t += tPerVertex;
    inner = !inner;
  }
  return result;
}
