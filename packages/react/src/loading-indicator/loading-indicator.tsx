'use client';

import { type ComponentPropsWithRef, type CSSProperties, useEffect, useRef } from 'react';
import { cx } from '../foundation/cx.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import styles from './loading-indicator.module.css';
import tokens from './loading-indicator.tokens.generated.module.css';
import { blend, pathOf, SHAPES, spring } from './shapes.js';

export interface LoadingIndicatorProps
  extends Omit<ComponentPropsWithRef<'div'>, 'role' | 'children'> {
  /** Puts the shape on a circle of primary-container colour. */
  contained?: boolean;
  /** The side of the whole indicator in pixels. @default 48 */
  size?: number;
  /** Names what is loading. @default 'Loading' */
  'aria-label'?: string;
}

/** How long each shape takes to morph into the next, and the turn that goes with it. */
const STEP_MS = 650;
const TURN_PER_STEP = 90;

/**
 * An indeterminate loading indicator: a shape that morphs through seven others, turning as it
 * goes. For a wait that is not worth a progress bar, such as a pull to refresh, or a short load.
 * With reduced motion it is the first shape, still.
 *
 * ```tsx
 * <LoadingIndicator aria-label="Loading messages" />
 * ```
 *
 * The animation runs in script (an animation frame loop that blends the shapes' outlines, see
 * shapes.ts), not in CSS, because the outlines have to change shape, which CSS cannot do in
 * every browser.
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
    const draw = (elapsed: number) => {
      // The first frame's timestamp can precede the moment the effect ran.
      const steps = Math.max(0, elapsed) / STEP_MS;
      const index = Math.floor(steps);
      const progress = spring(steps - index);
      const from = SHAPES[index % SHAPES.length] as (typeof SHAPES)[number];
      const to = SHAPES[(index + 1) % SHAPES.length] as (typeof SHAPES)[number];
      path.current?.setAttribute('d', pathOf(blend(from, to, progress)));
      turn.current?.setAttribute('transform', `rotate(${(index + progress) * TURN_PER_STEP})`);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      draw(now - start);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

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
      <svg className={styles.shape} viewBox="-1 -1 2 2" aria-hidden="true" focusable="false">
        <g ref={turn}>
          <path ref={path} d={pathOf(SHAPES[0] as (typeof SHAPES)[number])} />
        </g>
      </svg>
    </div>
  );
}
