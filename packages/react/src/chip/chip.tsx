'use client';

import type { ComponentPropsWithRef, KeyboardEvent, ReactNode, Ref } from 'react';
import { cx } from '../foundation/cx.js';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import { useStateLayer } from '../foundation/use-state-layer.js';
import styles from './chip.module.css';
import tokens from './chip.tokens.generated.module.css';

export type ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion';

interface ChipOwnProps {
  /**
   * - `assist`: a smart or automated action ("Add to calendar").
   * - `filter`: a toggle that narrows content; always has a selected state.
   * - `input`: a piece of user input, such as a tag or a recipient; can be removed.
   * - `suggestion`: a dynamically generated shortcut.
   * @default 'assist'
   */
  variant?: ChipVariant;
  /** A shadow and tinted container instead of an outline. Not for input chips. */
  elevated?: boolean;
  /**
   * Controlled selected state. Filter chips are always toggles; assist and
   * suggestion chips ignore it; an input chip is a toggle only when this or
   * `defaultSelected` is set.
   */
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Leading icon. Decorative; the label names the chip. A selected filter chip shows a check instead. */
  icon?: ReactNode;
  /** Leading avatar, such as an `<img>` of a contact. Decorative. */
  avatar?: ReactNode;
  /** Trailing icon, such as a drop-down arrow. Decorative. */
  trailingIcon?: ReactNode;
  /**
   * Adds a remove button, which calls this. Backspace or Delete on the focused chip
   * does the same. Meant for input chips.
   */
  onRemove?: () => void;
  /** Accessible name of the remove button. Defaults to "Remove <label>" for a text label. */
  removeLabel?: string;
  /** For links, `aria-disabled` is set and `href` removed. */
  disabled?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
  /** The label. */
  children: ReactNode;
}

type ChipButtonProps = Omit<ComponentPropsWithRef<'button'>, keyof ChipOwnProps | 'href'> & {
  href?: undefined;
};
type ChipAnchorProps = Omit<ComponentPropsWithRef<'a'>, keyof ChipOwnProps> & { href: string };

export type ChipProps = ChipOwnProps & (ChipButtonProps | ChipAnchorProps);

/**
 * A chip: a compact element for an action, a filter, an input or a suggestion.
 *
 * ```tsx
 * <ChipGroup aria-label="Genre">
 *   <Chip variant="filter" defaultSelected>Jazz</Chip>
 *   <Chip variant="filter">Blues</Chip>
 * </ChipGroup>
 * ```
 */
export function Chip(props: ChipProps) {
  const {
    variant = 'assist',
    elevated = false,
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    icon,
    avatar,
    trailingIcon,
    onRemove,
    removeLabel,
    disabled = false,
    render,
    children,
    className,
    onClick,
    onKeyDown,
    ref,
    href,
    type,
    ...rest
  } = props as ChipOwnProps & ChipAnchorProps & ComponentPropsWithRef<'button'>;

  const toggles =
    variant === 'filter' ||
    (variant === 'input' && (selectedProp !== undefined || defaultSelected !== undefined));
  const pressable = usePressable({
    href,
    disabled,
    selected: toggles ? selectedProp : undefined,
    defaultSelected: toggles ? (defaultSelected ?? false) : undefined,
    onSelectedChange,
    // Handlers are typed per element (button/anchor); the hook only needs the event.
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });
  const selected = toggles && pressable.selected;

  const removeLayer = useStateLayer<HTMLButtonElement>({ disabled });
  const leading = avatar
    ? 'avatar'
    : icon
      ? 'icon'
      : selected && variant === 'filter'
        ? 'check'
        : undefined;
  const removable = onRemove !== undefined;
  const editable = variant === 'input' && removable;

  const kind = variant === 'input' || variant === 'filter' ? variant : undefined;
  const classes = cx(
    styles.root,
    tokens.root,
    tokens[variant],
    toggles && kind && (selected ? tokens.selected : tokens.unselected),
    className,
  );

  const main = renderElement(
    pressable.tag,
    {
      ...rest,
      ...pressable.props,
      className: cx(styles.main),
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        (onKeyDown as ((event: KeyboardEvent<HTMLElement>) => void) | undefined)?.(event);
        if (
          editable &&
          !disabled &&
          !event.defaultPrevented &&
          /^(Backspace|Delete)$/.test(event.key)
        ) {
          event.preventDefault();
          onRemove?.();
        }
      },
      children: (
        <>
          {variant === 'filter' || leading ? (
            <span className={styles.leading} data-slot="leading" aria-hidden="true">
              {icon || avatar ? (
                <span className={styles.icon} data-slot="icon">
                  {avatar ?? icon}
                </span>
              ) : null}
              {variant === 'filter' ? (
                <svg
                  className={styles.tick}
                  data-slot="tick"
                  viewBox="0 0 18 18"
                  aria-hidden="true"
                >
                  <path d="M4 9.4l3.2 3.2L14 5.6" pathLength="1" />
                </svg>
              ) : null}
            </span>
          ) : null}
          <span className={styles.label} data-slot="label">
            {children}
          </span>
          {trailingIcon ? (
            <span className={styles.trailing} data-slot="trailing" aria-hidden="true">
              {trailingIcon}
            </span>
          ) : null}
        </>
      ),
    },
    render,
  );

  return (
    <span
      className={classes}
      data-variant={variant}
      data-elevated={elevated && variant !== 'input' ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-leading={leading}
      data-trailing={trailingIcon && !removable ? '' : undefined}
      data-removable={removable ? '' : undefined}
    >
      {main}
      {removable ? (
        <button
          ref={removeLayer.controlRef}
          type="button"
          className={styles.remove}
          data-slot="remove"
          aria-label={
            removeLabel ?? (typeof children === 'string' ? `Remove ${children}` : 'Remove')
          }
          disabled={disabled}
          onClick={() => onRemove?.()}
        >
          <StateLayer ref={removeLayer.surfaceRef} />
          <svg viewBox="0 -960 960 960" aria-hidden="true">
            <path d="m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z" />
          </svg>
        </button>
      ) : null}
      <StateLayer ref={pressable.surfaceRef} />
    </span>
  );
}
