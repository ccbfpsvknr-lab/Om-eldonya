import type { TileDef } from '../types';

/**
 * FAST board — 16 tiles, 16:9 rectangular layout.
 * Each city has a unique price and baseRent (ascending).
 */
export const fastBoard: TileDef[] = [
  { type: 'ramses', name: 'محطة رمسيس' },                                          // 0
  { type: 'city',   name: 'الإسكندرية', groupId: 'q1', price: 350, baseRent: 70 }, // 1
  { type: 'city',   name: 'مرسى مطروح', groupId: 'q1', price: 500, baseRent: 100 }, // 2
  { type: 'chance', name: 'فرصة' },                                                // 3
  { type: 'city',   name: 'المنصورة',   groupId: 'q2', price: 650, baseRent: 130 }, // 4
  { type: 'jail',   name: 'الحجز' },                                               // 5
  { type: 'city',   name: 'طنطا',       groupId: 'q2', price: 800, baseRent: 160 }, // 6
  { type: 'city',   name: 'الأقصر',    groupId: 'q3', price: 950, baseRent: 190 }, // 7
  { type: 'police', name: 'كمين' },                                               // 8
  { type: 'city',   name: 'أسوان',      groupId: 'q3', price: 1100, baseRent: 220 }, // 9
  { type: 'city',   name: 'الغردقة',   groupId: 'q4', price: 1250, baseRent: 250 }, // 10
  { type: 'chance', name: 'فرصة' },                                               // 11
  { type: 'city',   name: 'شرم الشيخ', groupId: 'q4', price: 1450, baseRent: 290 }, // 12
  { type: 'rest',   name: 'القهوة' },                                              // 13
  { type: 'city',   name: 'الجيزة',    groupId: 'q5', price: 1650, baseRent: 330 }, // 14
  { type: 'city',   name: 'القاهرة',   groupId: 'q5', price: 1900, baseRent: 380 }, // 15
];
