'use client';

import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useMemo,
} from 'react';
import { Badge } from '../badge/badge.js';
import { cx } from '../foundation/cx.js';
import { type RenderProp, renderElement } from '../foundation/merge-props.js';
import { StateLayer } from '../foundation/state-layer.js';
import { useControllableState } from '../foundation/use-controllable-state.js';
import { type PressableOptions, usePressable } from '../foundation/use-pressable.js';
import visuallyHidden from '../foundation/visually-hidden.module.css';
import styles from './navigation-bar.module.css';
import tokens from './navigation-bar.tokens.generated.module.css';

export type NavigationBarLayout = 'vertical' | 'horizontal';
/** When item labels are visible. A hidden label is still announced by assistive technology. */
export type NavigationBarLabelBehavior = 'always' | 'selected' | 'never';

interface NavigationBarContextValue {
  value: string | undefined;
  select: (value: string) => void;
  layout: NavigationBarLayout;
  labelBehavior: NavigationBarLabelBehavior;
}

const NavigationBarContext = createContext<NavigationBarContextValue | null>(null);

export interface NavigationBarProps
  extends Omit<ComponentPropsWithRef<'nav'>, 'defaultValue' | 'onChange'> {
  /** A landmark needs a name, since a page can have several. */
  'aria-label': string;
  /** The selected item's `value`. Controlled when defined. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * `vertical` puts the icon over the label (compact windows); `horizontal`
   * puts them side by side in one pill (medium windows).
   * @default 'vertical'
   */
  layout?: NavigationBarLayout;
  /**
   * Horizontal items always show their label unless this is `never`.
   * @default 'always'
   */
  labelBehavior?: NavigationBarLabelBehavior;
}

/**
 * The navigation bar. Destinations are links or buttons
 * in a list inside a `<nav>` landmark, and the current one is marked with
 * `aria-current="page"`.
 */
export function NavigationBar({
  value: valueProp,
  defaultValue,
  onValueChange,
  layout = 'vertical',
  labelBehavior = 'always',
  className,
  children,
  ...rest
}: NavigationBarProps) {
  const [value, select] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue,
    onChange: (next) => next !== undefined && onValueChange?.(next),
  });
  const context = useMemo(
    () => ({ value, select: select as (value: string) => void, layout, labelBehavior }),
    [value, select, layout, labelBehavior],
  );

  return (
    <NavigationBarContext value={context}>
      <nav {...rest} className={cx(styles.root, tokens.root, className)}>
        <ul className={styles.list}>{children}</ul>
      </nav>
    </NavigationBarContext>
  );
}

interface NavigationBarItemOwnProps {
  /** Identifies this destination; compared with the bar's `value`. */
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
  keyof NavigationBarItemOwnProps | 'href'
> & {
  href?: undefined;
};
type AnchorProps = Omit<ComponentPropsWithRef<'a'>, keyof NavigationBarItemOwnProps> & {
  href: string;
};

export type NavigationBarItemProps = NavigationBarItemOwnProps & (ButtonProps | AnchorProps);

/**
 * One destination of a `NavigationBar`: an icon and a label, as a link (with an `href`) or a
 * button. The selected one is marked with `aria-current` and a pill behind its icon.
 */
export function NavigationBarItem(props: NavigationBarItemProps) {
  const context = useContext(NavigationBarContext);
  if (!context) throw new Error('<NavigationBarItem> must be rendered inside a <NavigationBar>.');

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
  } = props as NavigationBarItemOwnProps & AnchorProps & ComponentPropsWithRef<'button'>;

  const { layout, labelBehavior } = context;
  const selected = context.value === value;

  const pressable = usePressable({
    href,
    selected,
    onSelectedChange: (next) => next && context.select(value),
    onClick: onClick as PressableOptions['onClick'],
    ref: ref as Ref<HTMLElement> | undefined,
    type,
  });

  const showLabel = labelBehavior !== 'never';
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

  // The visual badge is hidden from assistive technology and its text is
  // announced after the label instead, so the name reads "Inbox 3", not "3 Inbox".
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
      'data-label-behavior': labelBehavior,
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
