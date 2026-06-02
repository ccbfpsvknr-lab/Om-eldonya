import { create } from 'zustand';
import type { GameConfig, GameMode, GamePhase, GameResult } from '@/types';
import { DEFAULT_CONFIG, generateRoomCode } from '@/lib/constants';

interface GameState {
  phase: GamePhase;
  config: GameConfig;
  result: GameResult;

  // ---- actions ----
  createGame: (partial?: Partial<GameConfig>) => void;
  updateConfig: (partial: Partial<GameConfig>) => void;
  setMode: (mode: GameMode) => void;
  setPhase: (phase: GamePhase) => void;
  setWinner: (winnerId: string | null) => void;
  resetGame: () => void;
}

const initialResult: GameResult = { winnerId: null, finishedAt: null };

export const useGameStore = create<GameState>((set) => ({
  phase: 'idle',
  config: { ...DEFAULT_CONFIG },
  result: { ...initialResult },

  createGame: (partial) =>
    set(() => ({
      phase: 'setup',
      config: {
        ...DEFAULT_CONFIG,
        roomCode: generateRoomCode(),
        ...partial,
      },
      result: { ...initialResult },
    })),

  updateConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  setMode: (mode) => set((state) => ({ config: { ...state.config, mode } })),

  setPhase: (phase) => set(() => ({ phase })),

  setWinner: (winnerId) =>
    set(() => ({
      phase: 'finished',
      result: { winnerId, finishedAt: Date.now() },
    })),

  resetGame: () =>
    set(() => ({
      phase: 'idle',
      config: { ...DEFAULT_CONFIG },
      result: { ...initialResult },
    })),
}));
