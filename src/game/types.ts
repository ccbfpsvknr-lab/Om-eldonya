import type { GameMode } from '@/types';

export type BoardSize = 'fast' | 'regular' | 'full';

export type TileType =
  | 'ramses'
  | 'city'
  | 'project'
  | 'chance'
  | 'news'
  | 'tax'
  | 'police'
  | 'jail'
  | 'rest';

export interface BoardTile {
  index: number;
  type: TileType;
  name: string;
  cityId?: string;
  projectId?: string;
  groupId?: string;
  price?: number;
}

export type TileDef = Omit<BoardTile, 'index'>;

export interface City {
  id: string;
  name: string;
  region: string;
  groupId: string;
  tileIndex: number;
  price: number;
  baseRent: number;
  /** Upgrade level 0-3 (0 = unimproved). */
  level: number;
  rent: number[];
  buildCost: number;
  ownerId: string | null;
  mortgaged: boolean;
}

export interface Project {
  id: string;
  name: string;
  tileIndex: number;
  price: number;
  ownerId: string | null;
  mortgaged: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  vehicle: string;
  seat: number;
  position: number;
  cash: number;
  isHost: boolean;
  isActive: boolean;
  laps: number;
  /** Turns remaining in jail (0 = free). */
  jailTurns: number;
  /** Outstanding bank loan. Salary at Ramses pays this first. */
  solfaDebt: number;
  /** True if free-pass from rent active (from a chance card). */
  hasRentFreePass: boolean;
  /** Turns remaining to skip (from chance card). */
  skipTurns: number;
  /** Number of times sent to jail this match (for titles). */
  jailCount: number;
  /** Cumulative cash received this match (for titles). */
  totalEarned: number;
  /** Trades completed this match (for titles). */
  tradesCompleted: number;
}

export interface DiceState {
  value: number | null;
  rolling: boolean;
  rollCount: number;
}

export type MatchPhase = 'idle' | 'rolling' | 'moving' | 'turn-end' | 'finished';

export interface Statistics {
  rolls: number;
  ramsesPasses: number;
  totalMoves: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export type EventKind = 'chance' | 'news';

export interface ChanceCard {
  id: string;
  text: string;
}

export interface ActiveNewsEvent {
  eventId: string;
  roundsLeft: number;
}

export interface Trade {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offerCityIds: string[];
  requestCityIds: string[];
  offerCash: number;
  requestCash: number;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Auction {
  id: string;
  tileIndex: number;
  highestBid: number;
  highestBidderId: string | null;
  active: boolean;
}

export interface Game {
  mode: GameMode;
  boardSize: BoardSize;
  phase: MatchPhase;
  players: Player[];
  currentPlayerIndex: number;
  round: number;
  board: BoardTile[];
  cities: Record<string, City>;
  projects: Record<string, Project>;
  regionOwners?: Record<string, string | null>;
  dice: DiceState;
  winnerId: string | null;
  /** Shuffled deck of remaining chance card IDs. */
  chanceCardDeck: string[];
  /** Active news event (Full mode). */
  activeNewsEvent: ActiveNewsEvent | null;
  /** Rent multiplier from active news event (default 1.0). */
  newsRentMultiplier: number;
  /** Whether the current player has used their trade this turn. */
  tradeUsedThisTurn: boolean;
  /** Jail tile index (derived from board). */
  jailTileIndex: number;
  statistics: Statistics;
}
