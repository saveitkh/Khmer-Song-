/** Rough Khmer syllable counter: count base consonants (U+1780..U+17A2) that
 * are not immediately preceded by coeng (U+17D2). Good enough for the lyric
 * editor's per-line counts; a real provider may return authoritative values. */
export function countSyllables(line) {
  const chars = Array.from(String(line).trim());
  let count = 0;
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].codePointAt(0);
    const isConsonant = code >= 0x1780 && code <= 0x17a2;
    const prevCoeng = i > 0 && chars[i - 1].codePointAt(0) === 0x17d2;
    if (isConsonant && !prevCoeng) count++;
  }
  return count;
}

/** Last "word" index of a line (for a naive rhyme highlight). */
export function lastWordIndex(line) {
  const words = String(line).trim().split(/\s+/).filter(Boolean);
  return Math.max(0, words.length - 1);
}
