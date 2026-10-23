import type { Ref } from 'react';
import styles from './state-layer.module.css';

/**
 * The state layer: a tinted overlay for hover, focus and press, plus
 * the press ripple. Render it as the first child of a control that is
 * `position: relative; isolation: isolate`. The control supplies these private
 * variables:
 *
 * - `--_state-layer-color`
 * - `--_hover-state-layer-opacity`
 * - `--_focus-state-layer-opacity`
 * - `--_pressed-state-layer-opacity`
 */
export function StateLayer({ ref }: { ref?: Ref<HTMLSpanElement> }) {
  return <span ref={ref} className={styles.surface} data-wisp-state-layer="" aria-hidden="true" />;
}
