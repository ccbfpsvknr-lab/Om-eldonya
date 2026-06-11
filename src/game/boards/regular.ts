import type { TileDef } from '../types';

/**
 * REGULAR board — 24 tiles, rectangular layout.
 * Corners at 0 (Ramses/BL), 7 (Jail/BR), 12 (Rest/TR), 19 (Police/TL).
 * Regions c and d now have 3 cities each (water+court replaced with cities).
 */
export const regularBoard: TileDef[] = [
  // ── BOTTOM ROW (left → right) ──────────────────────────────
  { type: 'ramses',  name: 'محطة رمسيس' },           // 0  BL corner
  { type: 'city',   name: 'دمياط',          groupId: 'a' }, // 1
  { type: 'city',   name: 'بورسعيد',        groupId: 'a' }, // 2
  { type: 'chance', name: 'فرصة' },                   // 3
  { type: 'city',   name: 'الإسماعيلية',    groupId: 'b' }, // 4
  { type: 'project',name: 'الديوان المحلي' },          // 5
  { type: 'city',   name: 'السويس',         groupId: 'b' }, // 6
  { type: 'jail',   name: 'الحجز' },                  // 7  BR corner

  // ── RIGHT COLUMN (bottom → top) ────────────────────────────
  { type: 'city',   name: 'طنطا',           groupId: 'c' }, // 8
  { type: 'city',   name: 'المنصورة',        groupId: 'c' }, // 9
  { type: 'city',   name: 'كفر الشيخ',      groupId: 'c' }, // 10  ← was شركة المياه
  { type: 'news',   name: 'أخبار' },                  // 11

  // ── TOP ROW (right → left) ─────────────────────────────────
  { type: 'rest',   name: 'القهوة' },                 // 12  TR corner
  { type: 'city',   name: 'الزقازيق',        groupId: 'd' }, // 13
  { type: 'city',   name: 'بنها',            groupId: 'd' }, // 14
  { type: 'chance', name: 'فرصة' },                   // 15
  { type: 'city',   name: 'الجيزة',          groupId: 'e' }, // 16
  { type: 'city',   name: 'شبرا الخيمة',    groupId: 'd' }, // 17  ← was المحكمة الاقتصادية
  { type: 'city',   name: 'الإسكندرية',      groupId: 'e' }, // 18
  { type: 'police', name: 'كمين' },                   // 19  TL corner

  // ── LEFT COLUMN (top → bottom) ─────────────────────────────
  { type: 'news',   name: 'أخبار' },                  // 20
  { type: 'city',   name: 'الأقصر',          groupId: 'f' }, // 21
  { type: 'chance', name: 'فرصة' },                   // 22
  { type: 'city',   name: 'أسوان',           groupId: 'f' }, // 23
];
