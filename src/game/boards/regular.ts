import type { TileDef } from '../types';

/**
 * REGULAR board — 24 tiles. Corners at 0 (Ramses), 6 (jail), 12 (rest),
 * 18 (police). Ramses pays +1500 on pass/land (see RAMSES_SALARY).
 */
export const regularBoard: TileDef[] = [
  { type: 'ramses', name: 'محطة رمسيس' },
  { type: 'city', name: 'دمياط', groupId: 'a' },
  { type: 'chance', name: 'فرصة' },
  { type: 'city', name: 'بورسعيد', groupId: 'a' },
  { type: 'project', name: 'الديوان المحلي' },
  { type: 'city', name: 'الإسماعيلية', groupId: 'b' },
  { type: 'jail', name: 'السجن' },
  { type: 'city', name: 'السويس', groupId: 'b' },
  { type: 'news', name: 'أخبار' },
  { type: 'city', name: 'طنطا', groupId: 'c' },
  { type: 'city', name: 'المنصورة', groupId: 'c' },
  { type: 'project', name: 'شركة المياه' },
  { type: 'rest', name: 'القهوة' },
  { type: 'city', name: 'الزقازيق', groupId: 'd' },
  { type: 'chance', name: 'فرصة' },
  { type: 'city', name: 'بنها', groupId: 'd' },
  { type: 'city', name: 'الجيزة', groupId: 'e' },
  { type: 'project', name: 'المحكمة الاقتصادية' },
  { type: 'police', name: 'روح السجن' },
  { type: 'city', name: 'الإسكندرية', groupId: 'e' },
  { type: 'news', name: 'أخبار' },
  { type: 'city', name: 'الأقصر', groupId: 'f' },
  { type: 'project', name: 'شركة الكهرباء' },
  { type: 'city', name: 'أسوان', groupId: 'f' },
];
