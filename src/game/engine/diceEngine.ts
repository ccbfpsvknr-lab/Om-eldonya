import type { DiceState } from '../types';

export const DIE_MIN = 1;
export const DIE_MAX = 6;

/**
 * Roll a single fair die (1–6). `rng` is injectable for deterministic tests.
 */
export function rollDie(rng: () => number = Math.random): number {
  return DIE_MIN + Math.floor(rng() * (DIE_MAX - DIE_MIN + 1));
}

export function createInitialDice(): DiceState {
  return { value: null, rolling: false, rollCount: 0 };
}
