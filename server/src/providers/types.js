/**
 * Provider contracts (documented here; JS has no interfaces). Each real adapter
 * and the mock implement these shapes. Selection happens in ./index.js by env.
 *
 * VoiceProvider:
 *   name: string
 *   preview({ referenceKey, transcript, text }) -> Promise<{ url: string|null, durationS: number }>
 *       Synthesize `text` in the cloned voice. referenceKey is an R2 key of the
 *       consented reference recording.
 *
 * LyricsProvider:
 *   name: string
 *   generate({ prompt, mood, genre, structure }) ->
 *       Promise<{ model: string, sections: Array<{ kind, label, lines: Array<{ text, syllables, highlights:number[] }> }> }>
 *
 * MusicProvider:
 *   name: string
 *   generate({ lyrics, style, instrumental }) ->
 *       Promise<{ provider, masterUrl: string|null, coverUrl: string|null,
 *                 bpm: number|null, key: string|null, durationS: number|null,
 *                 stems: Array<{ kind:'vocal'|'backing'|'lrc', url:string|null, format:string }> }>
 *
 * Every real adapter must: never sing/clone a non-consented voice, respect the
 * watermark flag, and surface a friendly error when its key/worker is unset.
 */
export class ProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
