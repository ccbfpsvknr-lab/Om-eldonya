/**
 * Fisher–Yates shuffle. Returns a NEW array; does not mutate the input.
 * Used by the reveal screen to randomise turn order before the match is
 * created (the engine builds players in array order, so a shuffled array
 * yields a random turn order without touching engine logic).
 */
export function shuffle<T>(input: readonly T[]): T[] {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
