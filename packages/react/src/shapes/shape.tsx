'use client';

import { type ComponentPropsWithRef, type CSSProperties, useEffect, useRef, useState } from 'react';
import { cx } from '../foundation/cx.js';
import { cubicsToPath } from './cubic.js';
import { Morph } from './morph.js';
import { springPosition, springSettleSeconds } from './motion.js';
import type { RoundedPolygon } from './rounded-polygon.js';
import styles from './shapes.module.css';

export interface ShapeProps
  extends Omit<ComponentPropsWithRef<'svg'>, 'children' | 'viewBox' | 'd' | 'role'> {
  /**
   * The outline to draw, in the unit square: one of the `shapes` catalogue, or a
   * `RoundedPolygon` you made. When it changes, the old outline morphs into the new one.
   */
  shape: RoundedPolygon;
  /** The width and height. A number is pixels; a string is any CSS length. @default '1em' */
  size?: number | string;
  /** Morph when `shape` changes. Off, or with reduced motion, the outline just changes. @default true */
  animated?: boolean;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Draws a shape, in the colour of the text around it, and morphs it into another when `shape`
 * changes. It is decorative unless it has an `aria-label` (or `aria-labelledby`), which makes it
 * an image.
 *
 * ```tsx
 * <Shape shape={shapes.cookie9Sided} size={64} style={{ color: 'var(--md-sys-color-primary)' }} />
 * ```
 *
 * The morph runs in script, as a spring over an animation frame loop, because an outline can
 * only be animated between two different paths in script. Its work is done once per change of
 * shape and applied straight to the path, so a morph causes no React renders.
 */
export function Shape({
  shape,
  size = '1em',
  animated = true,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: ShapeProps) {
  const path = useRef<SVGPathElement>(null);
  // The outline the path is at, or on its way to, and the morph that is under way, if one is.
  const settled = useRef(shape);
  const running = useRef<{ morph: Morph; start: number } | null>(null);
  // Only the first outline is rendered by React: after that script owns the path's `d`, and an
  // unchanged value means React leaves it alone.
  const [initial] = useState(() => cubicsToPath(shape.cubics));

  useEffect(() => {
    const el = path.current;
    if (!el || settled.current === shape) return;

    // A change in the middle of a morph starts from whichever end is nearer, so it never jumps
    // far.
    let from = settled.current;
    const interrupted = running.current;
    if (interrupted) {
      const progress = springPosition((performance.now() - interrupted.start) / 1000);
      from = progress < 0.5 ? interrupted.morph.start : interrupted.morph.end;
    }
    settled.current = shape;
    running.current = null;

    if (!animated || reducedMotion()) {
      el.setAttribute('d', cubicsToPath(shape.cubics));
      return;
    }

    const morph = new Morph(from, shape);
    const start = performance.now();
    const duration = springSettleSeconds();
    running.current = { morph, start };
    let frame = requestAnimationFrame(function tick(now) {
      const seconds = Math.max(0, now - start) / 1000;
      if (seconds >= duration) {
        el.setAttribute('d', cubicsToPath(shape.cubics));
        running.current = null;
        return;
      }
      el.setAttribute('d', morph.toSvgPath(springPosition(seconds)));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [shape, animated]);

  const named = ariaLabel !== undefined || ariaLabelledBy !== undefined;
  return (
    <svg
      {...rest}
      role={named ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-hidden={named ? undefined : true}
      focusable="false"
      viewBox="0 0 1 1"
      className={cx(styles.root, className)}
      style={
        { ...style, '--_size': typeof size === 'number' ? `${size}px` : size } as CSSProperties
      }
    >
      <path ref={path} d={initial} />
    </svg>
  );
}
