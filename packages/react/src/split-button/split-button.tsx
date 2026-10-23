'use client';

import { type MouseEvent, type ReactNode, useMemo } from 'react';
import { Button, type ButtonSize } from '../button/button.js';
import { ButtonGroupContext } from '../foundation/button-group-context.js';
import { cx } from '../foundation/cx.js';
import { Menu, type MenuPlacement } from '../menu/menu.js';
import styles from './split-button.module.css';
import tokens from './split-button.tokens.generated.module.css';

export type SplitButtonVariant = 'elevated' | 'filled' | 'tonal' | 'outlined';

export interface SplitButtonProps {
  /** The action's label. */
  children: ReactNode;
  /** `MenuItem`s for the menu the chevron opens. */
  menu: ReactNode;
  /** Names the chevron button, e.g. "More save options". */
  menuLabel: string;
  /** @default 'filled' */
  variant?: SplitButtonVariant;
  /** @default 'small' */
  size?: ButtonSize;
  /** A leading icon for the action. Decorative. */
  icon?: ReactNode;
  /** Runs the action: the part of the button that is not the chevron. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /** Where the menu opens from. @default 'bottom-end' */
  menuPlacement?: MenuPlacement;
  /** Controlled open state of the menu. */
  menuOpen?: boolean;
  defaultMenuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  className?: string;
}

/** A downward chevron, 24px, in a 24px icon box. */
const Chevron = () => (
  <span className={styles.chevron}>
    <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
      <path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z" />
    </svg>
  </span>
);

/**
 * A split button: a primary action with a chevron beside it that opens a menu of related ones.
 *
 * ```tsx
 * <SplitButton
 *   menuLabel="More save options"
 *   onClick={save}
 *   menu={<MenuItem onClick={saveAs}>Save as…</MenuItem>}
 * >
 *   Save
 * </SplitButton>
 * ```
 */
export function SplitButton({
  children,
  menu,
  menuLabel,
  variant = 'filled',
  size = 'small',
  icon,
  onClick,
  disabled,
  menuPlacement = 'bottom-end',
  menuOpen,
  defaultMenuOpen,
  onMenuOpenChange,
  className,
}: SplitButtonProps) {
  const context = useMemo(() => ({ size, connected: true }), [size]);

  return (
    <ButtonGroupContext value={context}>
      {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> brings its own border, padding and min-width, and expects a <legend>; a labelled ARIA group is the right fit for two related buttons. */}
      <div role="group" className={cx(styles.root, tokens[`size-${size}`], className)}>
        <Button
          variant={variant}
          icon={icon}
          onClick={onClick}
          disabled={disabled}
          data-split="action"
        >
          {children}
        </Button>
        <Menu
          placement={menuPlacement}
          open={menuOpen}
          defaultOpen={defaultMenuOpen}
          onOpenChange={onMenuOpenChange}
          aria-label={menuLabel}
          trigger={
            <Button
              variant={variant}
              aria-label={menuLabel}
              disabled={disabled}
              data-split="menu"
              icon={<Chevron />}
            />
          }
        >
          {menu}
        </Menu>
      </div>
    </ButtonGroupContext>
  );
}
