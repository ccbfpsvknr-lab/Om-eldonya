import type { TileDef } from '../types';

/**
 * FULL board — 40 tiles, 9 regions (f1–f9), 22 cities.
 * Corners: 0 Ramses, 10 Jail, 20 Rest, 30 Police.
 * Regions: f1(2), f2(3), f3(3), f4(2), f5(2), f6(2), f7(3), f8(3), f9(2) = 22 cities.
 * Total city cost = 44 000 (preserved from original).
 */
export const fullBoard: TileDef[] = [
  { type: 'ramses',  name: 'ميدان رمسيس' },          // 0
  { type: 'city',    name: 'العريش',        groupId: 'f1' }, // 1
  { type: 'news',    name: 'أخبار' },                  // 2
  { type: 'city',    name: 'مرسى مطروح',   groupId: 'f1' }, // 3
  { type: 'tax',     name: 'ضرائب' },                  // 4
  { type: 'project', name: 'محطة مصر' },               // 5
  { type: 'city',    name: 'كفر الشيخ',    groupId: 'f2' }, // 6
  { type: 'chance',  name: 'فرصة' },                   // 7
  { type: 'city',    name: 'دمنهور',        groupId: 'f2' }, // 8
  { type: 'city',    name: 'دمياط',         groupId: 'f2' }, // 9
  { type: 'jail',    name: 'السجن' },                  // 10
  { type: 'city',    name: 'بورسعيد',       groupId: 'f3' }, // 11
  { type: 'project', name: 'شركة الكهرباء' },          // 12
  { type: 'city',    name: 'الإسماعيلية',   groupId: 'f3' }, // 13
  { type: 'city',    name: 'السويس',         groupId: 'f3' }, // 14
  { type: 'project', name: 'محطة رمسيس' },             // 15
  { type: 'city',    name: 'طنطا',           groupId: 'f4' }, // 16
  { type: 'news',    name: 'أخبار' },                  // 17
  { type: 'city',    name: 'المنصورة',       groupId: 'f4' }, // 18
  { type: 'chance',  name: 'فرصة' },                   // 19
  { type: 'rest',    name: 'استراحة' },                // 20
  { type: 'city',    name: 'الزقازيق',       groupId: 'f5' }, // 21
  { type: 'chance',  name: 'فرصة' },                   // 22
  { type: 'city',    name: 'بنها',            groupId: 'f5' }, // 23
  { type: 'city',    name: 'الفيوم',          groupId: 'f6' }, // 24
  { type: 'project', name: 'محطة سيدي جابر' },        // 25
  { type: 'city',    name: 'بني سويف',        groupId: 'f6' }, // 26
  { type: 'city',    name: 'المنيا',           groupId: 'f7' }, // 27
  { type: 'project', name: 'شركة المياه' },            // 28
  { type: 'city',    name: 'أسيوط',           groupId: 'f7' }, // 29
  { type: 'police',  name: 'روح السجن' },             // 30
  { type: 'city',    name: 'سوهاج',           groupId: 'f7' }, // 31
  { type: 'city',    name: 'قنا',              groupId: 'f8' }, // 32
  { type: 'news',    name: 'أخبار' },                  // 33
  { type: 'city',    name: 'الأقصر',          groupId: 'f8' }, // 34
  { type: 'project', name: 'محطة الأقصر' },            // 35
  { type: 'city',    name: 'أسوان',           groupId: 'f8' }, // 36
  { type: 'chance',  name: 'فرصة' },                   // 37
  { type: 'city',    name: 'الغردقة',         groupId: 'f9' }, // 38
  { type: 'city',    name: 'شرم الشيخ',       groupId: 'f9' }, // 39
];
