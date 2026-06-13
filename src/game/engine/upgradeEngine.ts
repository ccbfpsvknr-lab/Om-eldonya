import type { City, Game } from '../types';

export const MAX_UPGRADE_LEVEL = 3;
/** Upgrade cost per level: level0→1 = 1.5×, 1→2 = 2×, 2→3 = 2.5× city price. */
export const UPGRADE_COST_RATIOS = [1.5, 2.0, 2.5] as const;
/** Refund on region-break = 50 % of upgrades invested. */
export const UPGRADE_REFUND_RATIO = 0.75;  // all sells are player-initiated — no trading
/** Rent multipliers per upgrade level (region-complete baseline = ×2 lives in economyEngine). */
export const UPGRADE_MULTIPLIERS = [1, 2, 4, 8] as const;

/** Cost to upgrade city from its CURRENT level to the next level. */
export function getUpgradeCost(city: City): number {
  const ratio = UPGRADE_COST_RATIOS[city.level as 0 | 1 | 2] ?? 0;
  return Math.round(city.price * ratio);
}

/** Total amount paid in upgrades for city at its current level (sum of each level's cost). */
export function totalUpgradeInvestment(city: City): number {
  return UPGRADE_COST_RATIOS.slice(0, city.level).reduce((sum, r) => sum + Math.round(city.price * r), 0);
}

export function canUpgrade(game: Game, city: City, playerId: string): boolean {
  if (city.ownerId !== playerId) return false;
  if (city.level >= MAX_UPGRADE_LEVEL) return false;
  const player = game.players.find((p) => p.id === playerId);
  return (player?.cash ?? 0) >= getUpgradeCost(city);
}

/**
 * Strip all upgrades from every city in `region` owned by `playerId` and
 * return the total cash refund (50 % of invested upgrade cost).
 */
export function stripRegionUpgrades(
  cities: Record<string, City>,
  region: string,
  playerId: string,
  refundRatio = UPGRADE_REFUND_RATIO,
): { updatedCities: Record<string, City>; refund: number } {
  let refund = 0;
  const updatedCities = { ...cities };
  for (const [id, city] of Object.entries(cities)) {
    if (city.region === region && city.ownerId === playerId && city.level > 0) {
      refund += Math.round(totalUpgradeInvestment(city) * refundRatio);
      updatedCities[id] = { ...city, level: 0 };
    }
  }
  return { updatedCities, refund };
}
