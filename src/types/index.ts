/**
 * Central domain types for أم الدنيا.
 * Gameplay is intentionally NOT implemented yet — these describe the
 * shape of state the architecture is built around.
 */

export type GamePhase =
  | 'idle' // no game created
  | 'setup' // configuring game / players
  | 'reveal' // randomly revealing roles or order
  | 'playing' // round in progress
  | 'finished'; // a winner exists

export type GameMode = 'classic' | 'quick';

export interface Player {
  id: string;
  name: string;
  /** 0-based seat / join order */
  seat: number;
  /** hex or token color used for the player's avatar chip */
  color: string;
  /** Emoji of the vehicle token chosen in Player Setup. */
  vehicle: string;
  score: number;
  isHost: boolean;
  isBot?: boolean;
}

export interface GameConfig {
  /** Human-friendly room code, e.g. "MASR42" */
  roomCode: string;
  mode: GameMode;
  maxPlayers: number;
  roundsCount: number;
}

export interface GameResult {
  winnerId: string | null;
  finishedAt: number | null;
}
