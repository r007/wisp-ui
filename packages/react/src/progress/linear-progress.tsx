import type { ComponentPropsWithRef, CSSProperties } from 'react';
import { cx } from '../foundation/cx.js';
import styles from './linear-progress.module.css';
import tokens from './progress.tokens.generated.module.css';

export interface LinearProgressProps
  extends Omit<ComponentPropsWithRef<'div'>, 'role' | 'children'> {
  /** How far along, from 0 to `max`. Leave it out for an indeterminate indicator. */
  value?: number;
  /** @default 100 */
  max?: number;
  /** Expressive: the active bar is a moving wave. */
  wavy?: boolean;
  /** Names what is progressing. Without a visible label, pass this or `aria-labelledby`. */
  'aria-label'?: string;
}

/**
 * A linear progress indicator. Give it a `value` for determinate progress, or none while
 * the length of the wait is unknown:
 *
 * ```tsx
 * <LinearProgress aria-label="Uploading" value={40} />
 * ```
 */
export function LinearProgress({
  value,
  max = 100,
  wavy = false,
  className,
  style,
  ...rest
}: LinearProgressProps) {
  const determinate = value !== undefined;
  const clamped = determinate ? Math.min(Math.max(value, 0), max) : 0;
  const progress = max > 0 ? clamped / max : 0;

  return (
    <div
      {...rest}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={determinate ? clamped : undefined}
      className={cx(styles.root, tokens.root, tokens.linear, className)}
      style={{ ...style, '--_progress': determinate ? progress : undefined } as CSSProperties}
      data-wavy={wavy ? '' : undefined}
      data-indeterminate={determinate ? undefined : ''}
      data-complete={determinate && progress >= 1 ? '' : undefined}
    >
      <span className={styles.track} />
      <span className={styles.bar} />
      <span className={styles.stop} />
    </div>
  );
}
