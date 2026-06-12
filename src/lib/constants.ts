import type { GameConfig } from '@/types';

/** All route paths in one place to avoid magic strings. */
export const ROUTES = {
  home: '/',
  create: '/create-game',
  players: '/player-setup',
  reveal: '/random-reveal',
  board: '/game-board',
  winner: '/winner',
  auth:   '/auth',
  admin:  '/admin',
  rooms:  '/rooms',
  rules:  '/rules',
  play:      '/play',
  friends:   '/friends',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Player chip colors — drawn from the Egyptian palette. */
export const PLAYER_COLORS = [
  '#E0B43C', // gold
  '#2A9D8F', // teal
  '#C75B39', // clay
  '#5B8DEF', // lapis
  '#9B5DE5', // amethyst
  '#56C48A', // success green
  '#EADBB7', // sand
  '#E05656', // danger red
] as const;

export const PLAYER_LIMITS = {
  min: 2,
  max: 4,
} as const;

export const DEFAULT_CONFIG: GameConfig = {
  roomCode: '',
  mode: 'classic',
  maxPlayers: 4,
  roundsCount: 5,
};

/** Generate a short, readable, RTL-safe room code (Latin chars + digits). */
export function generateRoomCode(length = 5): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}
