/** Random Egyptian nicknames assigned when a player leaves their name blank. */
export const EGYPTIAN_NICKNAMES = [
  'الحجة أطاطا',
  'عم شكشك',
  'الأسطى بلية',
  'عوكل',
  'عاطف',
  'اللمبي',
  'حزلقوم',
  'أبو الدهب',
  'عم سمسم',
  'الست دلال',
  'بو البقش',
  'الحاج لمبة',
  'أبو شنب',
  'شيخ الهارة',
  'الباشا',
  'ريا وسكينة',
  'عم كشري',
  'الصنايعي فتحي',
  'أبو النجا',
  'الحجة زيزي',
] as const;

/** Return a random nickname not already in `usedNames`. */
export function randomNickname(usedNames: string[]): string {
  const pool = EGYPTIAN_NICKNAMES.filter((n) => !usedNames.includes(n));
  const source = pool.length > 0 ? pool : [...EGYPTIAN_NICKNAMES];
  return source[Math.floor(Math.random() * source.length)];
}
