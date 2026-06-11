import type { GameMode, Player as LobbyPlayer } from '@/types';
import type { BoardSize, Game, Player, Statistics } from '../types';
import { boardSizeForMode, buildCities, buildProjects, getBoard } from '../boards';
import { createInitialDice } from './diceEngine';
import { computeRegionOwners } from './economyEngine';
import { buildShuffledDeck } from '../data/chanceCards';
import { STARTING_CASH, FAST_STARTING_CASH } from '../config';

export interface CreateGameParams {
  mode: GameMode;
  players: LobbyPlayer[];
  boardSize?: BoardSize;
  startingCash?: number;
}

export function createInitialStatistics(): Statistics {
  return { rolls: 0, ramsesPasses: 0, totalMoves: 0, startedAt: Date.now(), finishedAt: null };
}

export function toGamePlayers(lobby: LobbyPlayer[], startingCash: number): Player[] {
  return lobby.map((p, seat) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    vehicle: p.vehicle,
    seat,
    position: 0,
    cash: startingCash,
    isBot: p.isBot ?? false,
    isHost: p.isHost,
    isActive: true,
    laps: 0,
    jailTurns: 0,
    solfaDebt: 0,
    solfaCount: 0,
    skipTurns: 0,
    hasRentFreePass: false,
    jailCount: 0,
    totalEarned: startingCash,
    tradesCompleted: 0,
  }));
}

export function createGame(params: CreateGameParams): Game {
  const boardSize = params.boardSize ?? boardSizeForMode(params.mode);
  const startingCash = params.startingCash ?? (params.mode === 'quick' ? FAST_STARTING_CASH : STARTING_CASH);
  const board = getBoard(boardSize);
  const jailTile = board.find((t) => t.type === 'jail');
  const jailTileIndex = jailTile?.index ?? 10;

  const game: Game = {
    mode: params.mode,
    boardSize,
    phase: 'rolling',
    players: toGamePlayers(params.players, startingCash),
    currentPlayerIndex: 0,
    round: 1,
    board,
    cities: buildCities(board),
    projects: buildProjects(board),
    dice: createInitialDice(),
    winnerId: null,
    chanceCardDeck: buildShuffledDeck(params.mode === 'quick'),
    activeNewsEvent: null,
    newsRentMultiplier: 1,
    tradeUsedThisTurn: false,
    hasUpgradedThisTurn: false,
    jailTileIndex,
    eliminatedOrder: [],
    statistics: createInitialStatistics(),
  };

  game.regionOwners = computeRegionOwners(game);
  return game;
}

export function getCurrentPlayer(game: Game): Player | undefined {
  return game.players[game.currentPlayerIndex];
}

export interface TurnAdvance {
  currentPlayerIndex: number;
  round: number;
}

/** Advance to the next ACTIVE player, skipping bankrupt ones. */
export function advanceTurn(game: Game): TurnAdvance {
  const count = game.players.length;
  if (count === 0) return { currentPlayerIndex: 0, round: game.round };

  let next = (game.currentPlayerIndex + 1) % count;
  let safety = 0;
  while (!game.players[next].isActive && safety < count) {
    next = (next + 1) % count;
    safety++;
  }
  const round = next <= game.currentPlayerIndex ? game.round + 1 : game.round;
  return { currentPlayerIndex: next, round };
}
