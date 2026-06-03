export interface RegionTier {
  price: number;
  baseRent: number;
}

// Fast + Regular boards use single-letter groupIds a–f
export const REGION_TIERS: Record<string, RegionTier> = {
  a: { price: 600,  baseRent: 60  },
  b: { price: 1000, baseRent: 100 },
  c: { price: 1400, baseRent: 140 },
  d: { price: 1800, baseRent: 180 },
  e: { price: 2200, baseRent: 220 },
  f: { price: 2600, baseRent: 260 },
  g: { price: 3000, baseRent: 300 },
  h: { price: 3400, baseRent: 340 },

  // Fast (quick) board uses q1–q5: smaller prices tuned for 5000 starting cash
  q1: { price: 400,  baseRent: 40  },
  q2: { price: 650,  baseRent: 65  },
  q3: { price: 950,  baseRent: 95  },
  q4: { price: 1300, baseRent: 130 },
  q5: { price: 1700, baseRent: 170 },

  // Full board uses f1–f9 (9 smaller regions, total city cost preserved at 44 000)
  f1: { price: 600,  baseRent: 60  },
  f2: { price: 950,  baseRent: 95  },
  f3: { price: 1300, baseRent: 130 },
  f4: { price: 1650, baseRent: 165 },
  f5: { price: 2000, baseRent: 200 },
  f6: { price: 2350, baseRent: 235 },
  f7: { price: 2700, baseRent: 270 },
  f8: { price: 3050, baseRent: 305 },
  f9: { price: 3400, baseRent: 340 },
};

export const DEFAULT_TIER: RegionTier = { price: 1000, baseRent: 100 };

export function regionTier(region: string): RegionTier {
  return REGION_TIERS[region] ?? DEFAULT_TIER;
}
