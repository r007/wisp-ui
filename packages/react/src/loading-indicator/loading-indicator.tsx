'use client';

import { type ComponentPropsWithRef, type CSSProperties, useEffect, useRef } from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { shapes } from '../shapes/catalog.js';
import { cubicsToPath } from '../shapes/cubic.js';
import { lerp } from '../shapes/math.js';
import { springPosition } from '../shapes/motion.js';
import styles from './loading-indicator.module.css';
import tokens from './loading-indicator.tokens.generated.module.css';
import { indicatorMorphs, indicatorScale, SEQUENCE } from './morphs.js';

export interface LoadingIndicatorProps
  extends Omit<ComponentPropsWithRef<'div'>, 'role' | 'children'> {
  /** Puts the shape on a circle of primary-container colour. */
  contained?: boolean;
  /** The side of the whole indicator in pixels. @default 48 */
  size?: number;
  /** Names what is loading. @default 'Loading' */
  'aria-label'?: string;
}

/** How long each shape takes to morph into the next, and the quarter turn that goes with it. */
const STEP_MS = 650;
const TURN_PER_STEP = 90;
/** The whole shape also turns steadily, once round in this long. */
const GLOBAL_TURN_MS = 4666;

/**
 * The transform that centres a shape (whose centre is `cx`, `cy` in the unit square) in the
 * box, shrinks it to `scale`, and turns it by `degrees` about that centre.
 */
const place = (cx: number, cy: number, scale: number, degrees: number) =>
  `translate(0.5 0.5) rotate(${degrees}) scale(${scale}) translate(${-cx} ${-cy})`;

/**
 * An indeterminate loading indicator: a shape that morphs through seven others, turning as it
 * goes. For a wait that is not worth a progress bar, such as a pull to refresh, or a short load.
 * With reduced motion it is the first shape, still.
 *
 * ```tsx
 * <LoadingIndicator aria-label="Loading messages" />
 * ```
 *
 * The animation runs in script (an animation frame loop that asks each morph for its outline),
 * not in CSS, because the outline has to change shape, which CSS cannot do in every browser.
 * Matching the shapes to each other is done once, the first time an indicator runs.
 */
export function LoadingIndicator({
  contained = false,
  size,
  className,
  style,
  ref,
  'aria-label': ariaLabel = 'Loading',
  ...rest
}: LoadingIndicatorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(rootRef, ref);
  const path = useRef<SVGPathElement>(null);
  const turn = useRef<SVGGElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const morphs = indicatorMorphs();
    const scale = indicatorScale();

    const draw = (elapsed: number) => {
      // The first frame's timestamp can precede the moment the effect ran.
      const time = Math.max(0, elapsed);
      const steps = time / STEP_MS;
      const index = Math.floor(steps);
      const progress = springPosition((time - index * STEP_MS) / 1000);
      const morph = morphs[index % morphs.length] as (typeof morphs)[number];
      path.current?.setAttribute('d', morph.toSvgPath(progress));
      // Turn about the shape's own centre, which a morph moves from one shape's to the next's.
      const cx = lerp(morph.start.center.x, morph.end.center.x, progress);
      const cy = lerp(morph.start.center.y, morph.end.center.y, progress);
      const degrees = (index + progress) * TURN_PER_STEP + (time / GLOBAL_TURN_MS) * 360;
      turn.current?.setAttribute('transform', place(cx, cy, scale, degrees));
    };

    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      draw(now - start);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const first = shapes[SEQUENCE[0]];
  return (
    <div
      {...rest}
      ref={mergedRef}
      role="progressbar"
      aria-label={ariaLabel}
      className={cx(
        styles.root,
        tokens.root,
        contained && styles.contained,
        contained && tokens.contained,
        className,
      )}
      style={size === undefined ? style : ({ ...style, '--_scale': size / 48 } as CSSProperties)}
      data-contained={contained ? '' : undefined}
    >
      <svg className={styles.shape} viewBox="0 0 1 1" aria-hidden="true" focusable="false">
        <g ref={turn} transform={place(first.center.x, first.center.y, indicatorScale(), 0)}>
          <path ref={path} d={cubicsToPath(first.cubics)} />
        </g>
      </svg>
    </div>
  );
}
