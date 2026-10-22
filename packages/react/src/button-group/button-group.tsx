'use client';

import { type ComponentPropsWithRef, useMemo } from 'react';
import {
  ButtonGroupContext,
  type ButtonGroupContextValue,
} from '../foundation/button-group-context.js';
import { cx } from '../foundation/cx.js';
import styles from './button-group.module.css';
import tokens from './button-group.tokens.generated.module.css';

export type ButtonGroupSize = ButtonGroupContextValue['size'];

export interface ButtonGroupProps extends Omit<ComponentPropsWithRef<'div'>, 'role'> {
  /**
   * Buttons 2px apart that share their rounded corners, as one control. Toggle buttons in a
   * connected group become a segmented selector.
   */
  connected?: boolean;
  /** The size every `Button` inside defaults to, and the spacing between them. @default 'small' */
  size?: ButtonGroupSize;
  /** Names the group, when it is a set of related controls. */
  'aria-label'?: string;
}

/**
 * Lays out related `Button`s, sizing them together:
 *
 * ```tsx
 * <ButtonGroup connected aria-label="Text alignment">
 *   <Button variant="outlined" selected>Left</Button>
 *   <Button variant="outlined">Centre</Button>
 * </ButtonGroup>
 * ```
 */
export function ButtonGroup({
  connected = false,
  size = 'small',
  className,
  ...rest
}: ButtonGroupProps) {
  const context = useMemo(() => ({ size, connected }), [size, connected]);
  return (
    <ButtonGroupContext value={context}>
      {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> brings its own border, padding and min-width, and expects a <legend>; a labelled ARIA group is the right fit for a row of buttons. */}
      <div
        {...rest}
        role="group"
        className={cx(
          styles.root,
          tokens[`${connected ? 'connected' : 'standard'}-${size}` as keyof typeof tokens],
          className,
        )}
        data-connected={connected ? '' : undefined}
        data-size={size}
      />
    </ButtonGroupContext>
  );
}
