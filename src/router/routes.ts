import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { ROUTES } from '@/lib/constants';

/**
 * A single route definition. Components are lazily loaded so each screen
 * lands in its own chunk — keeps the initial bundle small and makes adding
 * future screens a one-line change.
 */
export interface AppRoute {
  path: string;
  /** Arabic label — handy for future breadcrumbs / document titles. */
  label: string;
  Component: LazyExoticComponent<ComponentType>;
}

export const appRoutes: AppRoute[] = [
  {
    path: ROUTES.home,
    label: 'القائمة الرئيسية',
    Component: lazy(() =>
      import('@/features/main-menu/MainMenu').then((m) => ({ default: m.MainMenu })),
    ),
  },
  {
    path: ROUTES.create,
    label: 'لعبة جديدة',
    Component: lazy(() =>
      import('@/features/create-game/CreateGame').then((m) => ({ default: m.CreateGame })),
    ),
  },
  {
    path: ROUTES.players,
    label: 'إعداد اللاعبين',
    Component: lazy(() =>
      import('@/features/player-setup/PlayerSetup').then((m) => ({ default: m.PlayerSetup })),
    ),
  },
  {
    path: ROUTES.reveal,
    label: 'القرعة',
    Component: lazy(() =>
      import('@/features/random-reveal/RandomReveal').then((m) => ({ default: m.RandomReveal })),
    ),
  },
  {
    path: ROUTES.board,
    label: 'اللعبة',
    Component: lazy(() =>
      import('@/features/game-board/GameBoard').then((m) => ({ default: m.GameBoard })),
    ),
  },
  {
    path: ROUTES.winner,
    label: 'النتيجة',
    Component: lazy(() =>
      import('@/features/winner/WinnerScreen').then((m) => ({ default: m.WinnerScreen })),
    ),
  },
  {
    path: ROUTES.friends,
    label: 'الأصدقاء',
    Component: lazy(() =>
      import('@/features/friends/FriendsScreen').then((m) => ({ default: m.FriendsScreen })),
    ),
  },
  {
    path: ROUTES.play,
    label: 'يلا بينا',
    Component: lazy(() =>
      import('@/features/game-mode/GameModeScreen').then((m) => ({ default: m.GameModeScreen })),
    ),
  },
  {
    path: ROUTES.rules,
    label: 'القواعد',
    Component: lazy(() =>
      import('@/features/rules/RulesScreen').then((m) => ({ default: m.RulesScreen })),
    ),
  },
  {
    path: ROUTES.rooms,
    label: 'الأصدقاء',
    Component: lazy(() =>
      import('@/features/rooms/RoomScreen').then((m) => ({ default: m.RoomScreen })),
    ),
  },
  {
    path: ROUTES.admin,
    label: 'Admin',
    Component: lazy(() =>
      import('@/features/admin/AdminScreen').then((m) => ({ default: m.AdminScreen })),
    ),
  },
  {
    path: ROUTES.auth,
    label: 'الدخول',
    Component: lazy(() =>
      import('@/features/auth/AuthScreen').then((m) => ({ default: m.AuthScreen })),
    ),
  },
];
