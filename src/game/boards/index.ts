import type { GameMode } from '@/types';
import type { BoardSize, BoardTile, City, Project, TileDef } from '../types';
import { regionTier } from '../data/regions';
import { fastBoard } from './fast';
import { regularBoard } from './regular';
import { fullBoard } from './full';

/** Tile counts per board size. */
export const BOARD_SIZES: Record<BoardSize, number> = {
  fast: 16,
  regular: 24,
  full: 40,
};

/**
 * Ramses (start tile) salary per board size, paid when a player passes OR
 * lands on Ramses. FAST pays nothing; REGULAR and FULL pay 1500.
 */
export const RAMSES_SALARY: Record<BoardSize, number> = {
  fast: 0,
  regular: 1500,
  full: 1500,
};

const RAW_BOARDS: Record<BoardSize, TileDef[]> = {
  fast: fastBoard,
  regular: regularBoard,
  full: fullBoard,
};

/** Default board size for a given lobby game mode. */
export function boardSizeForMode(mode: GameMode): BoardSize {
  switch (mode) {
    case 'quick':
      return 'fast';
    case 'custom':
      return 'full';
    case 'classic':
    default:
      return 'regular';
  }
}

/**
 * Resolve a board to indexed tiles. Validates the tile count, then assigns
 * each tile its board index and a stable id for cities/projects.
 */
export function getBoard(size: BoardSize): BoardTile[] {
  const defs = RAW_BOARDS[size];
  const expected = BOARD_SIZES[size];
  if (defs.length !== expected) {
    throw new Error(`Board "${size}" must have ${expected} tiles but has ${defs.length}.`);
  }
  return defs.map((def, index) => {
    const tile: BoardTile = { ...def, index };
    if (tile.type === 'city' && !tile.cityId) tile.cityId = `city-${index}`;
    if (tile.type === 'project' && !tile.projectId) tile.projectId = `proj-${index}`;
    return tile;
  });
}

/** Build the City lookup from an indexed board (ownership empty in 2A). */
export function buildCities(board: BoardTile[]): Record<string, City> {
  const cities: Record<string, City> = {};
  for (const tile of board) {
    if (tile.type === 'city' && tile.cityId) {
      const region = tile.groupId ?? 'misc';
      const tier = regionTier(region);
      cities[tile.cityId] = {
        id: tile.cityId,
        name: tile.name,
        region,
        groupId: region,
        tileIndex: tile.index,
        price: tile.price ?? tier.price,
        baseRent: tier.baseRent,
        level: 0,
        rent: [],
        buildCost: 0,
        ownerId: null,
        mortgaged: false,
      };
    }
  }
  return cities;
}

/** Build the Project lookup from an indexed board (ownership empty in 2A). */
export function buildProjects(board: BoardTile[]): Record<string, Project> {
  const projects: Record<string, Project> = {};
  for (const tile of board) {
    if (tile.type === 'project' && tile.projectId) {
      projects[tile.projectId] = {
        id: tile.projectId,
        name: tile.name,
        tileIndex: tile.index,
        price: tile.price ?? 0,
        ownerId: null,
        mortgaged: false,
      };
    }
  }
  return projects;
}

export { fastBoard, regularBoard, fullBoard };
