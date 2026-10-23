import type { ComponentPropsWithRef, ElementType } from 'react';
import { cx } from '../foundation/cx.js';
import { type RenderProp, type RootProps, renderElement } from '../foundation/merge-props.js';
import styles from './typography.module.css';

/** The 15 styles of the type scale: five roles, each in three sizes. */
export const TYPOGRAPHY_VARIANTS = [
  'display-large',
  'display-medium',
  'display-small',
  'headline-large',
  'headline-medium',
  'headline-small',
  'title-large',
  'title-medium',
  'title-small',
  'body-large',
  'body-medium',
  'body-small',
  'label-large',
  'label-medium',
  'label-small',
] as const;

export type TypographyVariant = (typeof TYPOGRAPHY_VARIANTS)[number];

export interface TypographyProps extends ComponentPropsWithRef<'span'> {
  /** Which style of the type scale. @default 'body-medium' */
  variant?: TypographyVariant;
  /** The emphasised form of the style, which Expressive uses for a heavier, more expressive voice. */
  emphasized?: boolean;
  /**
   * Render a different element, which is how a heading gets to be one:
   * `render={<h2 />}`. Without it a style is a `<p>` (body), a `<span>` (label) or a `<div>`.
   */
  render?: RenderProp;
}

/** The element a style is by default: text a reader meets as paragraphs, labels, and blocks. */
const defaultTag = (variant: TypographyVariant): ElementType =>
  variant.startsWith('body') ? 'p' : variant.startsWith('label') ? 'span' : 'div';

/**
 * Text in one of the type styles. It sets the font and the tracking from the system
 * tokens and nothing else, so the colour is the one it sits in. Choosing the element is up to
 * you, because a style is not a heading level:
 *
 * ```tsx
 * <Typography variant="headline-large" render={<h1 />}>Settings</Typography>
 * <Typography variant="body-medium">Choose what to share.</Typography>
 * ```
 */
export function Typography({
  variant = 'body-medium',
  emphasized = false,
  render,
  className,
  children,
  ref,
  ...rest
}: TypographyProps) {
  return renderElement(
    defaultTag(variant),
    {
      ...rest,
      ref: ref as RootProps['ref'],
      className: cx(styles.root, className),
      'data-variant': variant,
      'data-emphasized': emphasized ? '' : undefined,
      children,
    },
    render,
  );
}
