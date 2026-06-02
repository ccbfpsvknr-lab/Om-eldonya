/**
 * Programmatic access to theme tokens for places where Tailwind classes
 * don't reach (inline canvas colors, JS-driven gradients, etc.).
 * Mirrors the CSS variables declared in src/index.css.
 */

export type ThemeName = 'pharaoh';

export const themes = {
  pharaoh: {
    label: 'فرعوني',
    tokens: {
      bg: '#0E1726',
      surface: '#16223A',
      surface2: '#1E2D4A',
      border: '#384A6E',
      gold: '#E0B43C',
      goldBright: '#F4CE5E',
      goldDeep: '#B08426',
      teal: '#2A9D8F',
      clay: '#C75B39',
      sand: '#EADBB7',
      text: '#F4ECD6',
      muted: '#9AA6BC',
    },
  },
} satisfies Record<ThemeName, { label: string; tokens: Record<string, string> }>;

export const DEFAULT_THEME: ThemeName = 'pharaoh';

/** Apply a theme by toggling the data-theme attribute on <html>. */
export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}
