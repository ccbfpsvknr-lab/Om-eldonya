import type { TileDef } from '../types';

/**
 * FAST board — 16 tiles.
 * Corners: 0 Ramses, 4 Jail, 8 Rest, 12 Police.
 * 10 cities across 5 regions (q1–q5), 2 chance tiles.
 * Priced for 5000 starting cash. No salary at Ramses.
 */
export const fastBoard: TileDef[] = [
  { type: 'ramses',  name: 'ميدان رمسيس' },                     // 0
  { type: 'city',    name: 'الإسكندرية',  groupId: 'q1' },       // 1
  { type: 'city',    name: 'مرسى مطروح',  groupId: 'q1' },       // 2
  { type: 'chance',  name: 'فرصة' },                             // 3
  { type: 'jail',    name: 'السجن' },                            // 4
  { type: 'city',    name: 'المنصورة',    groupId: 'q2' },       // 5
  { type: 'city',    name: 'طنطا',         groupId: 'q2' },       // 6
  { type: 'city',    name: 'الأقصر',       groupId: 'q3' },       // 7
  { type: 'rest',    name: 'استراحة' },                          // 8
  { type: 'city',    name: 'أسوان',        groupId: 'q3' },       // 9
  { type: 'city',    name: 'الغردقة',      groupId: 'q4' },       // 10
  { type: 'chance',  name: 'فرصة' },                             // 11
  { type: 'police',  name: 'روح السجن' },                       // 12
  { type: 'city',    name: 'شرم الشيخ',    groupId: 'q4' },       // 13
  { type: 'city',    name: 'الجيزة',        groupId: 'q5' },       // 14
  { type: 'city',    name: 'القاهرة',       groupId: 'q5' },       // 15
];
