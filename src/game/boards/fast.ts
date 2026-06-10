import type { TileDef } from '../types';

/**
 * FAST board — 16 tiles, 16:9 rectangular layout.
 * Corners: 0 Ramses (bottom-left), 5 Jail (bottom-right),
 *          8 Police (top-right), 13 Rest (top-left).
 * Bottom row (left→right): 0,1,2,3,4,5
 * Right column (bottom→top): 5,6,7,8
 * Top row (right→left): 8,9,10,11,12,13
 * Left column (top→bottom): 13,14,15,0
 */
export const fastBoard: TileDef[] = [
  { type: 'ramses', name: 'محطة رمسيس' },                    // 0  bottom-left corner (START)
  { type: 'city',   name: 'الإسكندرية', groupId: 'q1' },      // 1  bottom row →
  { type: 'city',   name: 'مرسى مطروح', groupId: 'q1' },      // 2
  { type: 'chance', name: 'فرصة' },                            // 3
  { type: 'city',   name: 'المنصورة',   groupId: 'q2' },      // 4
  { type: 'jail',   name: 'الحجز' },                           // 5  bottom-right corner
  { type: 'city',   name: 'طنطا',        groupId: 'q2' },      // 6  right column ↑
  { type: 'city',   name: 'الأقصر',      groupId: 'q3' },      // 7
  { type: 'police', name: 'كمين' },                      // 8  top-right corner
  { type: 'city',   name: 'أسوان',       groupId: 'q3' },      // 9  top row ←
  { type: 'city',   name: 'الغردقة',     groupId: 'q4' },      // 10
  { type: 'chance', name: 'فرصة' },                            // 11
  { type: 'city',   name: 'شرم الشيخ',   groupId: 'q4' },      // 12
  { type: 'rest',   name: 'القهوة' },                         // 13 top-left corner
  { type: 'city',   name: 'الجيزة',       groupId: 'q5' },      // 14 left column ↓
  { type: 'city',   name: 'القاهرة',      groupId: 'q5' },      // 15
];
