export type ClassValue = string | false | null | undefined;

/** Joins the truthy class names. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
