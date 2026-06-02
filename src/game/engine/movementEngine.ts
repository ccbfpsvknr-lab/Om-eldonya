import type { BoardSize } from '../types';
import { BOARD_SIZES, RAMSES_SALARY } from '../boards';

export interface MoveResult {
  fromIndex: number;
  toIndex: number;
  steps: number;
  /** True when the move crossed the start tile (a full lap boundary). */
  wrapped: boolean;
  /** True when Ramses was passed over OR landed on. */
  passedRamses: boolean;
  /** True when the player ended exactly on Ramses (index 0). */
  landedOnRamses: boolean;
  /** Salary earned from Ramses for this move (0 on FAST). */
  salary: number;
}

/** Normalise any (possibly negative or overflowing) position onto the board. */
export function wrapIndex(position: number, size: number): number {
  return ((position % size) + size) % size;
}

/**
 * Resolve a forward move of `steps` tiles from `from` on the given board.
 * Ramses rule: passing OR landing on tile 0 earns the board's salary.
 */
export function resolveMove(from: number, steps: number, boardSize: BoardSize): MoveResult {
  const size = BOARD_SIZES[boardSize];
  const raw = from + steps;
  const toIndex = wrapIndex(raw, size);
  const wrapped = raw >= size; // crossed the board's start boundary
  const landedOnRamses = toIndex === 0;
  const passedRamses = wrapped || landedOnRamses;
  const salary = passedRamses ? RAMSES_SALARY[boardSize] : 0;

  return { fromIndex: from, toIndex, steps, wrapped, passedRamses, landedOnRamses, salary };
}
