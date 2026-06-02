import { Outlet } from 'react-router-dom';
import { PatternBackground } from '@/components/decor/PatternBackground';

/**
 * Root layout shell shared by every route. Provides the atmospheric
 * background and constrains content to a mobile-first column. Routed
 * screens render through <Outlet/>.
 *
 * Note: the global modal portal (<ModalRoot/>) is mounted once in App.tsx
 * so it lives above the router and is never duplicated.
 */
export function GameLayout() {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden">
      <PatternBackground />

      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
