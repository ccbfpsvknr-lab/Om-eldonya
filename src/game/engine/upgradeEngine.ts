import type { City, Game } from '../types';

export const MAX_UPGRADE_LEVEL = 3;
/** Upgrade cost = 15 % of the city's purchase price per level. */
export const UPGRADE_COST_RATIO = 0.15;
/** Refund on region-break = 50 % of upgrades invested. */
export const UPGRADE_REFUND_RATIO = 0.75;  // all sells are player-initiated — no trading
/** Rent multipliers per upgrade level (region-complete baseline = ×2 lives in economyEngine). */
export const UPGRADE_MULTIPLIERS = [1, 2, 4, 8] as const;

export function getUpgradeCost(city: City): number {
  return Math.round(city.price * UPGRADE_COST_RATIO);
}

/** Total upgrade investment for `city` at its current level. */
export function totalUpgradeInvestment(city: City): number {
  return city.level * getUpgradeCost(city);
}

export function canUpgrade(game: Game, city: City, playerId: string): boolean {
  if (city.ownerId !== playerId) return false;
  if (city.level >= MAX_UPGRADE_LEVEL) return false;
  // Can only upgrade when player owns the full region.
  const regionCities = Object.values(game.cities).filter((c) => c.region === city.region);
  return regionCities.every((c) => c.ownerId === playerId);
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
