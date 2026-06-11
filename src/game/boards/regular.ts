import type { TileDef } from '../types';

/**
 * REGULAR board — 24 tiles.
 * Each city has a unique price and baseRent (ascending around the board).
 * Regions c and d have 3 cities each.
 */
export const regularBoard: TileDef[] = [
  // ── BOTTOM ROW (left → right) ──────────────────────────────
  { type: 'ramses',  name: 'محطة رمسيس' },                                    // 0
  { type: 'city',   name: 'دمياط',        groupId: 'a', price:  500, baseRent:  50 }, // 1
  { type: 'city',   name: 'بورسعيد',      groupId: 'a', price:  650, baseRent:  65 }, // 2
  { type: 'chance', name: 'فرصة' },                                            // 3
  { type: 'city',   name: 'الإسماعيلية',  groupId: 'b', price:  800, baseRent:  80 }, // 4
  { type: 'project',name: 'الديوان المحلي' },                                  // 5
  { type: 'city',   name: 'السويس',       groupId: 'b', price:  950, baseRent:  95 }, // 6
  { type: 'jail',   name: 'الحجز' },                                           // 7

  // ── RIGHT COLUMN (bottom → top) ────────────────────────────
  { type: 'city',   name: 'طنطا',         groupId: 'c', price: 1100, baseRent: 110 }, // 8
  { type: 'city',   name: 'المنصورة',     groupId: 'c', price: 1200, baseRent: 120 }, // 9
  { type: 'city',   name: 'كفر الشيخ',   groupId: 'c', price: 1300, baseRent: 130 }, // 10
  { type: 'news',   name: 'أخبار' },                                           // 11

  // ── TOP ROW (right → left) ─────────────────────────────────
  { type: 'rest',   name: 'القهوة' },                                          // 12
  { type: 'city',   name: 'الزقازيق',     groupId: 'd', price: 1450, baseRent: 145 }, // 13
  { type: 'city',   name: 'بنها',         groupId: 'd', price: 1600, baseRent: 160 }, // 14
  { type: 'chance', name: 'فرصة' },                                            // 15
  { type: 'city',   name: 'الجيزة',       groupId: 'e', price: 2000, baseRent: 200 }, // 16
  { type: 'city',   name: 'القاهرة',          groupId: 'd', price: 1750, baseRent: 175 }, // 17
  { type: 'city',   name: 'الإسكندرية',  groupId: 'e', price: 2200, baseRent: 220 }, // 18
  { type: 'police', name: 'كمين' },                                            // 19

  // ── LEFT COLUMN (top → bottom) ─────────────────────────────
  { type: 'news',   name: 'أخبار' },                                           // 20
  { type: 'city',   name: 'الأقصر',       groupId: 'f', price: 2500, baseRent: 250 }, // 21
  { type: 'chance', name: 'فرصة' },                                            // 22
  { type: 'city',   name: 'أسوان',        groupId: 'f', price: 2800, baseRent: 280 }, // 23
];
