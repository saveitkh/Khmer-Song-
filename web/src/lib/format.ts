/** mm:ss from seconds. */
export function clock(totalS: number | null | undefined): string {
  if (totalS == null || !isFinite(totalS)) return "0:00";
  const s = Math.max(0, Math.round(totalS));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** "2 ម៉ោងមុន" style relative time in Khmer. */
export function relativeKm(iso: string): string {
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "អម្បាញ់មិញ";
  if (min < 60) return `${min} នាទីមុន`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ម៉ោងមុន`;
  const day = Math.round(hr / 24);
  if (day === 1) return "ម្សិលមិញ";
  if (day < 30) return `${day} ថ្ងៃមុន`;
  return new Date(iso).toLocaleDateString("km-KH");
}

/** Group thousands (credits etc). */
export function num(n: number): string {
  return n.toLocaleString("en-US");
}

/** Count Khmer syllables roughly for the lyric editor display. The server
 * returns authoritative counts; this is only for instant local feedback. */
export function khmerSyllables(line: string): number {
  // A syllable is a base consonant cluster; subscripts (coeng ្) and the
  // dependent vowels/diacritics attach to it. Count base consonants that are
  // not immediately preceded by a coeng.
  const chars = Array.from(line.trim());
  let count = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const code = c.codePointAt(0)!;
    const isKhmerConsonant = code >= 0x1780 && code <= 0x17a2;
    const prevCoeng = i > 0 && chars[i - 1].codePointAt(0) === 0x17d2;
    if (isKhmerConsonant && !prevCoeng) count++;
  }
  return count;
}
