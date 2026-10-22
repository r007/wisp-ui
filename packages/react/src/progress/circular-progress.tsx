import type { ComponentPropsWithRef } from 'react';
import { cx } from '../foundation/cx.js';
import styles from './circular-progress.module.css';
import tokens from './progress.tokens.generated.module.css';

export interface CircularProgressProps
  extends Omit<ComponentPropsWithRef<'div'>, 'role' | 'children'> {
  /** How far along, from 0 to `max`. Leave it out for an indeterminate indicator. */
  value?: number;
  /** @default 100 */
  max?: number;
  /** Expressive: the active arc is wavy. The circle is larger (48px) to make room. */
  wavy?: boolean;
  /** Names what is progressing. Without a visible label, pass this or `aria-labelledby`. */
  'aria-label'?: string;
}

// The sizes below mirror the `md.comp.progress-indicator.circular.*` tokens. The wave is a
// computed path, so it cannot read CSS variables; change these with the tokens.
const FLAT = { size: 40, thickness: 4, gap: 4 } as const;
const WAVY = { size: 48, thickness: 4, gap: 4, amplitude: 1.6, wavelength: 15 } as const;
const SAMPLES = 240;

/** A circle, or a circle with a sine wave on its radius, starting at 12 o'clock. */
function circlePath(radius: number, amplitude = 0, waves = 0): string {
  const centre = (amplitude ? WAVY.size : FLAT.size) / 2;
  let path = '';
  for (let i = 0; i <= SAMPLES; i += 1) {
    const angle = (i / SAMPLES) * Math.PI * 2;
    const r = radius + amplitude * Math.sin(waves * angle);
    // Angle 0 is straight up, running clockwise.
    const x = centre + r * Math.sin(angle);
    const y = centre - r * Math.cos(angle);
    path += `${i === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`;
  }
  return `${path}Z`;
}

/** The wavy circle's baseline radius, and a whole number of waves around it. */
const wavyRadius = (WAVY.size - WAVY.thickness) / 2 - WAVY.amplitude;
const WAVY_PATH = circlePath(
  wavyRadius,
  WAVY.amplitude,
  Math.round((2 * Math.PI * wavyRadius) / WAVY.wavelength),
);
const FLAT_RADIUS = (FLAT.size - FLAT.thickness) / 2;
const FLAT_PATH = circlePath(FLAT_RADIUS);

/**
 * A circular progress indicator. Give it a `value` for determinate progress, or none while
 * the length of the wait is unknown:
 *
 * ```tsx
 * <CircularProgress aria-label="Loading" />
 * ```
 */
export function CircularProgress({
  value,
  max = 100,
  wavy = false,
  className,
  ...rest
}: CircularProgressProps) {
  const determinate = value !== undefined;
  const clamped = determinate ? Math.min(Math.max(value, 0), max) : 0;
  const progress = max > 0 ? clamped / max : 0;

  const geometry = wavy ? WAVY : FLAT;
  const radius = wavy ? wavyRadius : FLAT_RADIUS;
  const size = geometry.size;
  const circumference = 2 * Math.PI * radius;
  // Round caps reach half the thickness past each dash end, so the gap that is *seen* is the
  // token's gap plus one thickness. Dashes are measured in percent of the path; the gap sits
  // half either side of each boundary between the arc and the track.
  const gap = ((geometry.gap + geometry.thickness) / circumference) * 100;
  const boundary = progress * 100;
  const arcLength = boundary - gap;
  const trackLength = 100 - boundary - gap;
  // A zero-length dash with round caps would still draw a dot, so draw nothing instead.
  const showArc = !determinate || (progress < 1 ? arcLength > 0 : true);
  const showTrack = determinate && progress < 1 && !(progress > 0 && trackLength <= 0);
  const splitArc = determinate && progress > 0 && progress < 1 && arcLength > 0;
  const splitTrack = splitArc && trackLength > 0;

  return (
    <div
      {...rest}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={determinate ? clamped : undefined}
      className={cx(styles.root, tokens.root, tokens.circular, className)}
      data-wavy={wavy ? '' : undefined}
      data-indeterminate={determinate ? undefined : ''}
    >
      <svg className={styles.svg} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {showTrack ? (
          <path
            className={styles.track}
            d={wavy ? WAVY_PATH : FLAT_PATH}
            pathLength={100}
            strokeWidth={geometry.thickness}
            strokeDasharray={splitTrack ? `${trackLength} 100` : undefined}
            strokeDashoffset={splitTrack ? -(boundary + gap / 2) : undefined}
          />
        ) : null}
        {showArc ? (
          <path
            className={styles.arc}
            d={wavy ? WAVY_PATH : FLAT_PATH}
            pathLength={100}
            strokeWidth={geometry.thickness}
            strokeDasharray={splitArc ? `${arcLength} 100` : undefined}
            strokeDashoffset={splitArc ? -(gap / 2) : undefined}
          />
        ) : null}
      </svg>
    </div>
  );
}
