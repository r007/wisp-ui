'use client';

import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useId,
  useMemo,
} from 'react';
import { cx } from '../foundation/cx.js';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { useMergedRef } from '../foundation/merge-refs.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { useModalDialog } from '../foundation/use-modal-dialog.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import styles from './navigation-drawer.module.css';
import tokens from './navigation-drawer.tokens.generated.module.css';

export type NavigationDrawerVariant = 'standard' | 'modal';

interface NavigationDrawerContextValue {
  value: string | undefined;
  select: (value: string) => void;
  /** Called after a destination is chosen, so a modal drawer can dismiss itself. */
  chosen: () => void;
}

const NavigationDrawerContext = createContext<NavigationDrawerContextValue | null>(null);

export interface NavigationDrawerProps
  extends Omit<ComponentPropsWithRef<'nav'>, 'defaultValue' | 'onChange' | 'ref'> {
  /** Names the navigation landmark (or, for a modal, the dialog). */
  'aria-label': string;
  /**
   * `standard` is part of the page layout. `modal` is a dialog over a scrim,
   * opened and closed with `open`.
   * @default 'standard'
   */
  variant?: NavigationDrawerVariant;
  /** Modal only. Whether the drawer is shown. */
  open?: boolean;
  /** Modal only. Called when the user dismisses it (Escape, scrim, or a destination). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Modal only: close after a destination is chosen.
   * @default true
   */
  closeOnSelect?: boolean;
  /** The selected destination's `value`. Controlled when defined. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ref?: Ref<HTMLElement>;
}

/**
 * The Material navigation drawer. Compose it from `NavigationDrawerSection`s
 * holding `NavigationDrawerItem`s:
 *
 * ```tsx
 * <NavigationDrawer variant="modal" open={open} onOpenChange={setOpen} aria-label="Main">
 *   <NavigationDrawerSection headline="Mail">
 *     <NavigationDrawerItem value="inbox" icon={<InboxIcon />} label="Inbox" />
 *   </NavigationDrawerSection>
 * </NavigationDrawer>
 * ```
 */
export function NavigationDrawer({
  variant = 'standard',
  open = false,
  onOpenChange,
  closeOnSelect = true,
  value: valueProp,
  defaultValue,
  onValueChange,
  className,
  children,
  ref,
  'aria-label': ariaLabel,
  ...rest
}: NavigationDrawerProps) {
  const [value, select] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue,
    onChange: (next) => next !== undefined && onValueChange?.(next),
  });

  const context = useMemo(
    () => ({
      value,
      select: select as (value: string) => void,
      chosen: () => {
        if (variant === 'modal' && closeOnSelect) onOpenChange?.(false);
      },
    }),
    [value, select, variant, closeOnSelect, onOpenChange],
  );

  // The native dialog owns the top layer and focus; React owns whether it is open.
  const modal = useModalDialog({ open: variant === 'modal' && open, onOpenChange });
  const mergedRef = useMergedRef<HTMLElement>(modal.ref as Ref<HTMLElement>, ref);

  const classes = cx(styles.root, tokens.root, className);

  if (variant === 'standard') {
    return (
      <nav
        {...rest}
        ref={mergedRef}
        aria-label={ariaLabel}
        className={cx(classes, styles.standard)}
      >
        <div className={styles.panel}>
          <NavigationDrawerContext value={context}>{children}</NavigationDrawerContext>
        </div>
      </nav>
    );
  }

  return (
    <dialog
      {...modal.props}
      ref={mergedRef as Ref<HTMLDialogElement>}
      aria-label={ariaLabel}
      className={cx(classes, styles.modal)}
    >
      <nav {...rest} className={styles.panel}>
        <NavigationDrawerContext value={context}>{children}</NavigationDrawerContext>
      </nav>
    </dialog>
  );
}

export interface NavigationDrawerSectionProps extends ComponentPropsWithRef<'div'> {
  /** An optional title for the group of destinations. */
  headline?: ReactNode;
}

/** A titled group of destinations. */
export function NavigationDrawerSection({
  headline,
  className,
  children,
  ...rest
}: NavigationDrawerSectionProps) {
  const id = useId();
  return (
    <div {...rest} className={cx(styles.section, className)}>
      {headline ? (
        <h2 id={id} className={styles.headline}>
          {headline}
        </h2>
      ) : null}
      {/* The heading names the list, so assistive technology announces it as a group. */}
      <ul className={styles.list} aria-labelledby={headline ? id : undefined}>
        {children}
      </ul>
    </div>
  );
}

/** A divider between sections. */
export function NavigationDrawerDivider({ className, ...rest }: ComponentPropsWithRef<'hr'>) {
  return <hr {...rest} className={cx(styles.divider, className)} />;
}

interface NavigationDrawerItemOwnProps {
  /** Identifies this destination; compared with the drawer's `value`. */
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  /** Short trailing text, such as a count. */
  badge?: ReactNode;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
}

type ButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  keyof NavigationDrawerItemOwnProps | 'href'
> & { href?: undefined };
type AnchorProps = Omit<ComponentPropsWithRef<'a'>, keyof NavigationDrawerItemOwnProps> & {
  href: string;
};

export type NavigationDrawerItemProps = NavigationDrawerItemOwnProps & (ButtonProps | AnchorProps);

export function NavigationDrawerItem(props: NavigationDrawerItemProps) {
  const context = useContext(NavigationDrawerContext);
  if (!context)
    throw new Error('<NavigationDrawerItem> must be rendered inside a <NavigationDrawer>.');

  const { value, label, icon, badge, render, className, onClick, ref, href, type, ...rest } =
    props as NavigationDrawerItemOwnProps & AnchorProps & ComponentPropsWithRef<'button'>;

  const selected = context.value === value;
  const pressable = usePressable({
    href,
    selected,
    onSelectedChange: (next) => next && context.select(value),
    onClick: ((event) => {
      (onClick as PressableOptions['onClick'])?.(event);
      context.chosen();
    }) as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });

  const element = renderElement(
    pressable.tag,
    {
      ...rest,
      ...pressable.props,
      // A destination is not a toggle: expose it as the current page, not as "pressed".
      'aria-pressed': undefined,
      'aria-current': selected ? 'page' : undefined,
      className: cx(styles.item, tokens.item, className),
      'data-selected': selected ? '' : undefined,
      children: (
        <>
          <StateLayer ref={pressable.surfaceRef} />
          {icon ? (
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className={styles.label}>{label}</span>
          {badge ? <span className={styles.trailing}>{badge}</span> : null}
        </>
      ),
    },
    render,
  );

  return <li>{element}</li>;
}
