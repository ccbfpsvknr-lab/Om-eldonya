import { useEffect, type ReactNode } from 'react';
import { applyTheme, DEFAULT_THEME, type ThemeName } from './tokens';

interface ThemeProviderProps {
  theme?: ThemeName;
  children: ReactNode;
}

/**
 * Ensures the document is in Arabic + RTL and carries the active theme.
 * index.html already sets lang/dir, but this guarantees correctness even
 * if the app is mounted into a different host page.
 */
export function ThemeProvider({ theme = DEFAULT_THEME, children }: ThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', 'ar');
    root.setAttribute('dir', 'rtl');
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
}
