import { Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { GameLayout } from '@/components/layout';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { appRoutes } from './routes';

/** Full-screen fallback shown while a lazy screen chunk loads. */
function ScreenFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <Spinner size={40} />
    </div>
  );
}

/**
 * The router is built from the centralized `appRoutes` table. Every screen
 * renders inside the shared <GameLayout/> shell (via <Outlet/>), and any
 * unknown path redirects home. Adding a screen = add one entry to routes.ts.
 */
const router = createBrowserRouter([
  {
    element: <GameLayout />,
    children: [
      ...appRoutes.map(({ path, Component }) => ({
        path,
        element: (
          <Suspense fallback={<ScreenFallback />}>
            <Component />
          </Suspense>
        ),
      })),
      { path: '*', element: <Navigate to={ROUTES.home} replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
