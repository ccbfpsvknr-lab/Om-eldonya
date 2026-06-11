export interface RegionTier {
  price: number;
  baseRent: number;
}

/**
 * Classic board (a–f): 8000 start cash, 2–3 cities per region
 * Fast board (q1–q5): 4000 start cash, 2 cities per region
 * Prices ascend with groupId — cheapest first, most expensive last.
 */
export const REGION_TIERS: Record<string, RegionTier> = {
  // ── Classic board ──────────────────────────────────────────────────────────
  a: { price:  500, baseRent:  50 },   // دمياط, بورسعيد
  b: { price:  800, baseRent:  80 },   // الإسماعيلية, السويس
  c: { price: 1100, baseRent: 110 },   // طنطا, المنصورة, كفر الشيخ (3 cities)
  d: { price: 1500, baseRent: 150 },   // الزقازيق, بنها, شبرا الخيمة (3 cities)
  e: { price: 2000, baseRent: 200 },   // الجيزة, الإسكندرية
  f: { price: 2700, baseRent: 270 },   // الأقصر, أسوان

  // ── Fast board ─────────────────────────────────────────────────────────────
  q1: { price:  350, baseRent:  35 },  // الإسكندرية, مرسى مطروح
  q2: { price:  600, baseRent:  60 },  // المنصورة, طنطا
  q3: { price:  900, baseRent:  90 },  // الأقصر, أسوان
  q4: { price: 1200, baseRent: 120 },  // الغردقة, شرم الشيخ
  q5: { price: 1700, baseRent: 170 },  // الجيزة, القاهرة
};

export const DEFAULT_TIER: RegionTier = { price: 1000, baseRent: 100 };

export function regionTier(region: string): RegionTier {
  return REGION_TIERS[region] ?? DEFAULT_TIER;
}
