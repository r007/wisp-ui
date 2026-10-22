import {
  type CSSProperties,
  cloneElement,
  createElement,
  type ElementType,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from './cx.js';
import { mergeRefs } from './merge-refs.js';

/** Props every rendered root can receive. */
export interface RootProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  ref?: Ref<never> | undefined;
  children?: ReactNode;
  [key: string]: unknown;
}

/**
 * Lets consumers swap the rendered element, e.g. for a router link:
 * `<Button render={<Link to="/" />}>`, or `render={(props) => <Link {...props} />}`.
 */
export type RenderProp<Props = RootProps> = ReactElement | ((props: Props) => ReactElement);

const isHandler = (key: string, value: unknown) =>
  /^on[A-Z]/.test(key) && typeof value === 'function';

/**
 * Merges the component's props with those of an element passed to `render`.
 * Classes are joined, styles merged, event handlers all run (the consumer's
 * first, so it can `preventDefault()`), refs combined. Anything else on the
 * consumer's element wins. `children` always comes from the component.
 */
export function mergeProps(own: RootProps, theirs: RootProps): RootProps {
  const merged: RootProps = { ...own, ...theirs };
  for (const key of Object.keys(own)) {
    const a = own[key];
    const b = theirs[key];
    if (b === undefined) continue;
    if (isHandler(key, a) && isHandler(key, b)) {
      merged[key] = (...args: unknown[]) => {
        (b as (...a: unknown[]) => void)(...args);
        const event = args[0] as { defaultPrevented?: boolean } | undefined;
        if (!event?.defaultPrevented) (a as (...a: unknown[]) => void)(...args);
      };
    }
  }
  merged.className = cx(own.className, theirs.className) || undefined;
  merged.style = own.style || theirs.style ? { ...own.style, ...theirs.style } : undefined;
  merged.ref = mergeRefs(own.ref, theirs.ref);
  merged.children = own.children;
  return merged;
}

export function renderElement(
  tag: ElementType,
  props: RootProps,
  render?: RenderProp,
): ReactElement {
  if (!render) return createElement(tag, props);
  if (typeof render === 'function') return render(props);
  return cloneElement(render, mergeProps(props, render.props as RootProps));
}
