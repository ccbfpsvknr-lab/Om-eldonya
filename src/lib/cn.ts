/**
 * Tiny className combiner. Filters out falsy values and joins with a space.
 * Kept dependency-free on purpose (no clsx/tailwind-merge needed for this shell).
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
