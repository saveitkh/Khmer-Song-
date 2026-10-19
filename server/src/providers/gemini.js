import { config } from "../config.js";
import { ProviderError } from "./types.js";

/**
 * Google Gemini adapters (AI Studio key).
 *   - geminiMusic: song generation via Lyria (lyria-3.5 / lyria-3-clip).
 *   - geminiTts:   speaking-voice synthesis (Gemini TTS, supports Khmer).
 *
 * SCOPE NOTE (read before enabling MUSIC_PROVIDER=gemini-lyria):
 *   Lyria's docs do NOT list Khmer as a supported singing language, accept no
 *   reference audio / voice cloning, and can't edit a generated track. Before
 *   this is wired as the default you MUST run the Khmer listening test (3 lyric
 *   sets × 3 genres) and decide whether pronunciation is usable. Until that
 *   evaluation is signed off, this adapter refuses loudly rather than shipping
 *   unverified Khmer song quality. Output carries Lyria's SynthID watermark and
 *   must be labelled "AI voice", never the user's cloned voice.
 */

export const geminiMusic = {
  name: "gemini-lyria",
  async generate() {
    if (!config.geminiKey) {
      throw new ProviderError("not_configured", "ម៉ាស៊ីន Gemini មិនទាន់កំណត់ GEMINI_API_KEY");
    }
    // Real call: Gemini Interactions API with lyria-3.5, custom lyrics tagged
    // [Verse]/[Chorus]/[Bridge]; upload returned audio to R2; run librosa for
    // bpm/key. Gated on the Khmer evaluation above.
    throw new ProviderError(
      "needs_evaluation",
      "Lyria មិនទាន់បានវាយតម្លៃគុណភាពការច្រៀងជាភាសាខ្មែរ។ សូមដំណើរការតេស្ត Khmer មុនបើកប្រើ (សូមមើល BUILD_PROMPT §6)។",
    );
  },
};

export const geminiTts = {
  name: "gemini-tts",
  async preview() {
    if (!config.geminiKey) {
      throw new ProviderError("not_configured", "ម៉ាស៊ីន Gemini TTS មិនទាន់កំណត់ GEMINI_API_KEY");
    }
    // Real call: Gemini TTS (config.geminiTtsModel) — Khmer supported — returns
    // WAV; upload to R2 and return a short-lived signed URL + duration.
    throw new ProviderError("not_implemented", "Gemini TTS adapter មិនទាន់ភ្ជាប់ (scope session នេះ = mock)។");
  },
  sampleQuality() {
    return { matchPct: null, noiseDb: null, synthetic: false };
  },
};
