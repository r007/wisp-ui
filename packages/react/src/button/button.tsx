'use client';

import { type ComponentPropsWithRef, type ReactNode, type Ref, use } from 'react';
import { ButtonGroupContext } from '../foundation/button-group-context.js';
import { cx } from '../foundation/cx.js';
import focusRing from '../foundation/focus-ring.module.css';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import styles from './button.module.css';
import tokens from './button.tokens.generated.module.css';

export type ButtonVariant = 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text';
export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

interface ButtonOwnProps {
  /** @default 'filled' */
  variant?: ButtonVariant;
  /** @default 'small' */
  size?: ButtonSize;
  /** @default 'round' */
  shape?: ButtonShape;
  /**
   * Makes this a toggle button. Controlled when defined; a selected toggle
   * morphs its shape, in the expressive style. Not available on
   * `text` buttons.
   */
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Leading icon. Decorative; the label names the button. */
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  /**
   * For links, `aria-disabled` is set and `href` removed, so the element is
   * neither focusable nor navigable.
   */
  disabled?: boolean;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
  children?: ReactNode;
}

type ButtonElementProps = Omit<ComponentPropsWithRef<'button'>, keyof ButtonOwnProps | 'href'> & {
  href?: undefined;
};
type AnchorElementProps = Omit<ComponentPropsWithRef<'a'>, keyof ButtonOwnProps> & { href: string };

export type ButtonProps = ButtonOwnProps & (ButtonElementProps | AnchorElementProps);

/**
 * A button for an action, or a link that looks like one. It renders a native `<button>`, or an
 * `<a>` when given an `href`, so the keyboard, forms and assistive technology work without extra
 * wiring. There are five variants (elevated, filled, tonal, outlined and text), five sizes, round
 * or square corners and an optional icon on either side; as a toggle it morphs its shape when it
 * is selected.
 *
 * ```tsx
 * <Button variant="filled" icon={<SendIcon />} onClick={send}>
 *   Send
 * </Button>
 * ```
 */
export function Button(props: ButtonProps) {
  const {
    variant = 'filled',
    size: sizeProp,
    shape = 'round',
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    icon,
    trailingIcon,
    disabled,
    render,
    children,
    className,
    onClick,
    ref,
    href,
    type,
    ...rest
  } = props as ButtonOwnProps & AnchorElementProps & ComponentPropsWithRef<'button'>;

  // Inside a ButtonGroup the group sizes its buttons, and a connected one shapes their corners.
  const group = use(ButtonGroupContext);
  const size = sizeProp ?? group?.size ?? 'small';

  const pressable = usePressable({
    href,
    disabled,
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    // Handlers are typed per element (button/anchor); the hook only needs the event.
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });
  const { isToggle, selected } = pressable;

  return renderElement(
    pressable.tag,
    {
      ...rest,
      ...pressable.props,
      className: cx(
        styles.root,
        focusRing.focusRing,
        tokens.root,
        tokens[variant],
        tokens[`size-${size}`],
        isToggle && (selected ? tokens.selected : tokens.unselected),
        className,
      ),
      'data-variant': variant,
      'data-size': size,
      'data-shape': shape,
      'data-connected': group?.connected ? '' : undefined,
      'data-selected': isToggle && selected ? '' : undefined,
      children: (
        <>
          <StateLayer ref={pressable.surfaceRef} />
          {icon ? (
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
          ) : null}
          {children !== undefined && children !== null && children !== false ? (
            <span>{children}</span>
          ) : null}
          {trailingIcon ? (
            <span className={styles.icon} aria-hidden="true">
              {trailingIcon}
            </span>
          ) : null}
        </>
      ),
    },
    render,
  );
}
