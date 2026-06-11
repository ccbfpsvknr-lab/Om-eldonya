import type { City, Game } from '../types';
import { UPGRADE_MULTIPLIERS } from './upgradeEngine';

export function citiesInRegion(game: Game, region: string): City[] {
  return Object.values(game.cities).filter((c) => c.region === region);
}

export function isRegionComplete(game: Game, region: string, ownerId: string): boolean {
  const cities = citiesInRegion(game, region);
  return cities.length > 0 && cities.every((c) => c.ownerId === ownerId);
}

export function computeRegionOwners(game: Game): Record<string, string | null> {
  const owners: Record<string, string | null> = {};
  const regions = new Set(Object.values(game.cities).map((c) => c.region));
  for (const region of regions) {
    const cities = citiesInRegion(game, region);
    const first = cities[0]?.ownerId ?? null;
    owners[region] =
      first !== null && cities.every((c) => c.ownerId === first) ? first : null;
  }
  return owners;
}

/**
 * Rent for landing on `city`. Accounts for:
 * - No owner → 0
 * - Region incomplete → baseRent
 * - Region complete, level 0 → baseRent × 2
 * - Region complete, level 1-3 → baseRent × UPGRADE_MULTIPLIERS[level] × 2
 * - Active news rent modifier (newsRentMultiplier, default 1.0)
 */
export function getCityRent(game: Game, city: City): number {
  if (city.ownerId === null) return 0;
  const complete = isRegionComplete(game, city.region, city.ownerId);
  const levelMult = UPGRADE_MULTIPLIERS[Math.min(city.level, 3) as 0 | 1 | 2 | 3];
  const regionMult = complete ? 2 : 1;
  const newsMultiplier = game.newsRentMultiplier ?? 1;
  // Classic also uses ×2 to keep games moving
  const rentMult = 2;
  return Math.round(city.baseRent * levelMult * regionMult * newsMultiplier * rentMult);
}
