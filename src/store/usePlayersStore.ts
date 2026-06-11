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
  toggleBot: (id: string) => void;
}

function nextColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

const BOT_NAMES = ['الباشا','زيزو','فلفل','الأسطى','شيخ الحارة','عم شكشك','حمدي','الزعيم'];
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

  toggleBot: (id) =>
    set((state) => ({
      players: state.players.map((p, idx) => {
        if (p.id !== id) return p;
        if (p.isBot) return { ...p, isBot: false, name: '' };
        const usedV = state.players.filter((x) => x.id !== id).map((x) => x.vehicle);
        const allV  = ['🛺','🏍️','🚕','🚐','🚌','🚚'];
        const v     = allV.find((v) => !usedV.includes(v)) ?? '🏍️';
        const nBots = state.players.filter((x) => x.isBot).length;
        return { ...p, isBot: true, vehicle: v,
          name: BOT_NAMES[nBots % BOT_NAMES.length] };
      }),
    })),

  resetPlayers: () => set(() => ({ players: [] })),
}));

/** Selector: can the game start? (enough players joined) */
export const selectCanStart = (state: PlayersState): boolean =>
  state.players.length >= PLAYER_LIMITS.min;
