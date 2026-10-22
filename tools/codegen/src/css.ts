/**
 * Small helpers shared by the CSS emitters.
 */

/** `md.sys.color.on-primary` → `--md-sys-color-on-primary`. */
export function customProperty(token: string): string {
  return `--${token.replaceAll('.', '-')}`;
}

/** Trims float noise: `0.10000000000000002` → `0.1`. */
export function num(value: number, digits = 4): string {
  return String(Number(value.toFixed(digits)));
}

export function px(value: number): string {
  return `${num(value)}px`;
}

/** Font metrics use `rem` so they follow the user's font-size preference. */
export function rem(pixels: number): string {
  return `${num(pixels / 16)}rem`;
}

export function ms(value: number): string {
  return `${num(value)}ms`;
}
