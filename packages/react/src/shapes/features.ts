/**
 * The features of a polygon: its corners and the edges between them.
 *
 * Adapted from Flutter's `material_ui` shapes (`shapes/features.dart`), Copyright 2013 The
 * Flutter Authors, BSD-3-Clause, which is itself a port of the AndroidX `graphics-shapes`
 * library, Copyright 2022 The Android Open Source Project, Apache-2.0.
 *
 * Changes from the original: one class with a `kind`, instead of an abstract class and two
 * subclasses.
 */

import type { Cubic } from './cubic.js';
import { DISTANCE_EPSILON, type PointTransformer } from './math.js';

export type FeatureKind = 'edge' | 'convex' | 'concave';

/**
 * A part of a polygon's outline: an edge, or a convex or concave corner. A feature is one or
 * more continuous cubics. A morph maps the corners of one shape to the corners of another, so
 * a feature's kind decides what it is matched with.
 */
export class PolygonFeature {
  readonly cubics: readonly Cubic[];
  readonly kind: FeatureKind;

  /** Unchecked: the factories below validate, the polygon builder knows what it passes. */
  constructor(cubics: readonly Cubic[], kind: FeatureKind) {
    this.cubics = cubics;
    this.kind = kind;
  }

  /** An edge that a morph may ignore. */
  static ignorable(cubics: readonly Cubic[]): PolygonFeature {
    return validated(new PolygonFeature(cubics, 'edge'));
  }

  /** A single-curve edge. */
  static edge(cubic: Cubic): PolygonFeature {
    return new PolygonFeature([cubic], 'edge');
  }

  static convexCorner(cubics: readonly Cubic[]): PolygonFeature {
    return validated(new PolygonFeature(cubics, 'convex'));
  }

  static concaveCorner(cubics: readonly Cubic[]): PolygonFeature {
    return validated(new PolygonFeature(cubics, 'concave'));
  }

  get isIgnorable(): boolean {
    return this.kind === 'edge';
  }

  get isEdge(): boolean {
    return this.kind === 'edge';
  }

  get isCorner(): boolean {
    return this.kind !== 'edge';
  }

  get isConvexCorner(): boolean {
    return this.kind === 'convex';
  }

  get isConcaveCorner(): boolean {
    return this.kind === 'concave';
  }

  transformed(transformer: PointTransformer): PolygonFeature {
    return new PolygonFeature(
      this.cubics.map((c) => c.transformed(transformer)),
      this.kind,
    );
  }

  /** The same feature run backwards: a convex corner becomes concave. */
  get reversed(): PolygonFeature {
    const reversed = this.cubics.map(
      (_, i) => (this.cubics[this.cubics.length - 1 - i] as Cubic).reversed,
    );
    const kind = this.kind === 'edge' ? 'edge' : this.kind === 'convex' ? 'concave' : 'convex';
    return new PolygonFeature(reversed, kind);
  }
}

function validated(feature: PolygonFeature): PolygonFeature {
  if (feature.cubics.length === 0) throw new RangeError('Features need at least one cubic.');
  let prev = feature.cubics[0] as Cubic;
  for (let i = 1; i < feature.cubics.length; i++) {
    const cubic = feature.cubics[i] as Cubic;
    if (
      Math.abs(cubic.anchor0X - prev.anchor1X) > DISTANCE_EPSILON ||
      Math.abs(cubic.anchor0Y - prev.anchor1Y) > DISTANCE_EPSILON
    ) {
      throw new RangeError(
        'PolygonFeature must be continuous, with the anchor points of all cubics matching ' +
          'the anchor points of the preceding and succeeding cubics',
      );
    }
    prev = cubic;
  }
  return feature;
}
