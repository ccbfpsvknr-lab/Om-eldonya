import { create } from 'zustand';
import type { Player } from '@/types';
import { createId, PLAYER_COLORS, PLAYER_LIMITS } from '@/lib/constants';

interface PlayersState {
  players: Player[];

  // ---- actions ----
  addPlayer: (name: string, vehicle: string) => void;
  removePlayer: (id: string) => void;
  renamePlayer: (id: string, name: string) => void;
  setHost: (id: string) => void;
  resetPlayers: () => void;
}

function nextColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export const usePlayersStore = create<PlayersState>((set) => ({
  players: [],

  addPlayer: (name, vehicle) =>
    set((state) => {
      if (state.players.length >= PLAYER_LIMITS.max) return state;
      const seat = state.players.length;
      const player: Player = {
        id: createId(),
        name: name.trim() || `لاعب ${seat + 1}`,
        seat,
        color: nextColor(seat),
        vehicle,
        score: 0,
        isHost: state.players.length === 0,
      };
      return { players: [...state.players, player] };
    }),

  removePlayer: (id) =>
    set((state) => {
      const filtered = state.players
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, seat: i, color: nextColor(i) }));
      // If we removed the host, promote the first remaining player.
      if (filtered.length > 0 && !filtered.some((p) => p.isHost)) {
        filtered[0] = { ...filtered[0], isHost: true };
      }
      return { players: filtered };
    }),

  renamePlayer: (id, name) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? { ...p, name } : p)),
    })),

  setHost: (id) =>
    set((state) => ({
      players: state.players.map((p) => ({ ...p, isHost: p.id === id })),
    })),

  resetPlayers: () => set(() => ({ players: [] })),
}));

/** Selector: can the game start? (enough players joined) */
export const selectCanStart = (state: PlayersState): boolean =>
  state.players.length >= PLAYER_LIMITS.min;
