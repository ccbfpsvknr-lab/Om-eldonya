import type { TileDef } from '../types';

/**
 * FAST board — 16 tiles. Corners at 0 (Ramses), 4 (jail), 8 (rest),
 * 12 (police). No Ramses salary on this board (see RAMSES_SALARY).
 */
export const fastBoard: TileDef[] = [
  { type: 'ramses', name: 'ميدان رمسيس' },
  { type: 'city', name: 'الفيوم', groupId: 'a' },
  { type: 'chance', name: 'فرصة' },
  { type: 'city', name: 'بني سويف', groupId: 'a' },
  { type: 'jail', name: 'السجن' },
  { type: 'city', name: 'المنيا', groupId: 'b' },
  { type: 'project', name: 'محطة مصر' },
  { type: 'city', name: 'أسيوط', groupId: 'b' },
  { type: 'rest', name: 'استراحة' },
  { type: 'city', name: 'الأقصر', groupId: 'c' },
  { type: 'news', name: 'أخبار' },
  { type: 'city', name: 'أسوان', groupId: 'c' },
  { type: 'police', name: 'روح السجن' },
  { type: 'city', name: 'الغردقة', groupId: 'd' },
  { type: 'project', name: 'شركة الكهرباء' },
  { type: 'city', name: 'شرم الشيخ', groupId: 'd' },
];
