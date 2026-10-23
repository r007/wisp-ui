'use client';

import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  type Ref,
  use,
  useMemo,
} from 'react';
import { Badge } from '../badge/badge.js';
import { cx } from '../foundation/cx.js';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import visuallyHidden from '../foundation/visually-hidden.module.css';
import styles from './navigation-rail.module.css';
import tokens from './navigation-rail.tokens.generated.module.css';

/** When collapsed item labels are visible. A hidden label is still announced by assistive technology. */
export type NavigationRailLabelBehavior = 'always' | 'selected' | 'never';

interface NavigationRailContextValue {
  value: string | undefined;
  select: (value: string) => void;
  expanded: boolean;
  labelBehavior: NavigationRailLabelBehavior;
}

const NavigationRailContext = createContext<NavigationRailContextValue | null>(null);

export interface NavigationRailProps
  extends Omit<ComponentPropsWithRef<'nav'>, 'defaultValue' | 'onChange'> {
  /** A landmark needs a name, since a page can have several. */
  'aria-label': string;
  /** The selected item's `value`. Controlled when defined. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * An expanded rail is wide (220 to 360px) with each label beside its icon; a collapsed one
   * is 96px with the label under the icon.
   * @default false
   */
  expanded?: boolean;
  /** A 80px collapsed rail instead of 96px, for compact layouts. Ignored when expanded. */
  narrow?: boolean;
  /** Collapsed items only: when labels show. Expanded items always show them. @default 'always' */
  labelBehavior?: NavigationRailLabelBehavior;
  /** Above the destinations: a menu button, a FAB or a logo. */
  header?: ReactNode;
}

/**
 * The navigation rail. Destinations are links or buttons in a list
 * inside a `<nav>` landmark, and the current one is marked with `aria-current="page"`:
 *
 * ```tsx
 * <NavigationRail aria-label="Main" defaultValue="inbox">
 *   <NavigationRailItem value="inbox" label="Inbox" icon={<InboxIcon />} />
 * </NavigationRail>
 * ```
 */
export function NavigationRail({
  value: valueProp,
  defaultValue,
  onValueChange,
  expanded = false,
  narrow = false,
  labelBehavior = 'always',
  header,
  className,
  children,
  ...rest
}: NavigationRailProps) {
  const [value, select] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue,
    onChange: (next) => next !== undefined && onValueChange?.(next),
  });
  const context = useMemo(
    () => ({ value, select: select as (value: string) => void, expanded, labelBehavior }),
    [value, select, expanded, labelBehavior],
  );

  return (
    <NavigationRailContext value={context}>
      <nav
        {...rest}
        className={cx(styles.root, tokens.root, className)}
        data-expanded={expanded ? '' : undefined}
        data-narrow={narrow && !expanded ? '' : undefined}
      >
        {header ? <div className={styles.header}>{header}</div> : null}
        <ul className={styles.list}>{children}</ul>
      </nav>
    </NavigationRailContext>
  );
}

interface NavigationRailItemOwnProps {
  /** Identifies this destination; compared with the rail's `value`. */
  value: string;
  label: ReactNode;
  icon: ReactNode;
  /** Shown instead of `icon` while selected, typically a filled variant. */
  activeIcon?: ReactNode;
  /** `true` for a dot, or a short label such as a count. */
  badge?: ReactNode;
  /** Text alternative for a dot badge, e.g. "new messages". Read by assistive technology only. */
  badgeLabel?: string;
  /** Render a different element, e.g. a router link: `render={<Link to="/" />}`. */
  render?: RenderProp;
}

type ButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  keyof NavigationRailItemOwnProps | 'href'
> & {
  href?: undefined;
};
type AnchorProps = Omit<ComponentPropsWithRef<'a'>, keyof NavigationRailItemOwnProps> & {
  href: string;
};

export type NavigationRailItemProps = NavigationRailItemOwnProps & (ButtonProps | AnchorProps);

/** One destination in a `NavigationRail`. */
export function NavigationRailItem(props: NavigationRailItemProps) {
  const context = use(NavigationRailContext);
  if (!context) throw new Error('<NavigationRailItem> must be rendered inside a <NavigationRail>.');

  const {
    value,
    label,
    icon,
    activeIcon,
    badge,
    badgeLabel,
    render,
    className,
    onClick,
    ref,
    href,
    type,
    ...rest
  } = props as NavigationRailItemOwnProps & AnchorProps & ComponentPropsWithRef<'button'>;

  const { expanded, labelBehavior } = context;
  const layout = expanded ? 'horizontal' : 'vertical';
  const selected = context.value === value;

  const pressable = usePressable({
    href,
    selected,
    onSelectedChange: (next) => next && context.select(value),
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });

  const showLabel = expanded || labelBehavior !== 'never';
  const labelNode = (
    <span className={styles.label} data-slot="label">
      <span className={styles.labelClip}>
        <span className={styles.labelText}>{label}</span>
      </span>
    </span>
  );
  const hiddenLabel = (
    <span className={visuallyHidden.visuallyHidden} data-slot="label">
      {label}
    </span>
  );

  // The visual badge is hidden from assistive technology and its text is announced after the
  // label instead, so the name reads "Inbox 3", not "3 Inbox".
  const announcedBadge =
    badgeLabel ??
    (typeof badge === 'string' || typeof badge === 'number' ? String(badge) : undefined);

  const element = renderElement(
    pressable.tag,
    {
      ...rest,
      ...pressable.props,
      // A destination is not a toggle: expose it as the current page, not as "pressed".
      'aria-pressed': undefined,
      'aria-current': selected ? 'page' : undefined,
      className: cx(styles.item, tokens.item, className),
      'data-layout': layout,
      'data-label-behavior': expanded ? 'always' : labelBehavior,
      'data-selected': selected ? '' : undefined,
      children: (
        <>
          <span className={styles.indicator} data-slot="indicator">
            <StateLayer ref={pressable.surfaceRef} />
            <span className={styles.iconSlot} data-slot="icon">
              <span className={cx(styles.icon, styles.iconInactive)}>{icon}</span>
              {activeIcon ? (
                <span className={cx(styles.icon, styles.iconActive)}>{activeIcon}</span>
              ) : null}
              {badge ? (
                <span
                  className={styles.badge}
                  data-slot="badge"
                  data-badge={badge === true ? 'dot' : 'label'}
                  aria-hidden="true"
                >
                  <Badge>{badge === true ? null : badge}</Badge>
                </span>
              ) : null}
            </span>
            {layout === 'horizontal' && showLabel ? labelNode : null}
          </span>
          {layout === 'vertical' && showLabel ? labelNode : null}
          {showLabel ? null : hiddenLabel}
          {announcedBadge ? (
            <span className={visuallyHidden.visuallyHidden} data-slot="badge-label">
              {' '}
              {announcedBadge}
            </span>
          ) : null}
        </>
      ),
    },
    render,
  );

  return <li className={styles.listItem}>{element}</li>;
}
