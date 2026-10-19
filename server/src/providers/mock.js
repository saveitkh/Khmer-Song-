import { countSyllables, lastWordIndex } from "../lib/khmer.js";

/**
 * Mock adapters: deterministic-enough, instant, no network. Audio URLs are
 * null so the frontend's Waveform falls back to its animated bars — the whole
 * UX is demonstrable end to end with zero keys. Metrics returned here are
 * clearly synthetic and labelled as such; they are NOT shown as real quality
 * numbers in comparison screens unless a real engine produced them.
 */

const VERSE_LINES = [
  "យប់នេះខ្យល់បក់ត្រជាក់ស្រួលបួល",
  "ស្រមៃពីមុខអ្នកនៅក្បែរ",
  "ភ្លៀងធ្លាក់ម្ដងទៀតនៅភ្នំពេញ",
  "បេះដូងនៅតែរង់ចាំអ្នក",
];
const CHORUS_LINES = [
  "អូនជាភ្លេងនៃបេះដូងបង",
  "រាល់ថ្ងៃបងច្រៀងឈ្មោះអូន",
  "ទោះឆ្ងាយប៉ុណ្ណាក៏ចិត្តនៅជិត",
  "ស្នេហ៍យើងមិនចេះរសាយ",
];
const BRIDGE_LINES = [
  "បើថ្ងៃណាគ្មានអូននៅ",
  "ភ្លេងនេះនឹងស្ងាត់រៀងរហូត",
];

function toLines(arr) {
  return arr.map((text) => ({
    text,
    syllables: countSyllables(text),
    highlights: [lastWordIndex(text)], // naive end-rhyme highlight
  }));
}

export const mockLyrics = {
  name: "mock",
  async generate({ prompt, mood, genre }) {
    // Lightly weave the prompt into the opening line so output reflects input.
    const opener = prompt ? `${prompt.slice(0, 24)}…` : VERSE_LINES[0];
    const v1 = toLines([opener, ...VERSE_LINES.slice(1)]);
    return {
      model: `mock-lyrics (${mood}/${genre})`,
      sections: [
        { kind: "verse", label: "Verse 1", lines: v1 },
        { kind: "chorus", label: "Chorus", lines: toLines(CHORUS_LINES) },
        { kind: "verse", label: "Verse 2", lines: toLines(VERSE_LINES) },
        { kind: "bridge", label: "Bridge", lines: toLines(BRIDGE_LINES) },
        { kind: "chorus", label: "Chorus", lines: toLines(CHORUS_LINES) },
      ],
    };
  },
};

export const mockVoice = {
  name: "mock",
  async preview() {
    // No real audio in mock mode.
    return { url: null, durationS: 8 };
  },
  // Synthetic clone quality, labelled synthetic so routes can decide to hide it.
  sampleQuality() {
    return { matchPct: null, noiseDb: null, synthetic: true };
  },
};

export const mockMusic = {
  name: "mock",
  async generate({ style }) {
    return {
      provider: "mock",
      masterUrl: null,
      coverUrl: null,
      bpm: 92,
      key: "A minor",
      durationS: 118,
      stems: [
        { kind: "vocal", url: null, format: "wav" },
        { kind: "backing", url: null, format: "wav" },
        { kind: "lrc", url: null, format: "lrc" },
      ],
      style,
    };
  },
};
