import { config } from "../config.js";
import { mockLyrics, mockVoice, mockMusic } from "./mock.js";
import { claudeLyrics } from "./claude.js";
import { geminiMusic, geminiTts } from "./gemini.js";
import { voxcpmVoice } from "./voxcpm.js";

export function voiceProvider() {
  switch (config.voiceProvider) {
    case "voxcpm2":
      return voxcpmVoice;
    case "gemini-tts":
      return geminiTts;
    default:
      return mockVoice;
  }
}

export function lyricsProvider() {
  return config.lyricsProvider === "claude" ? claudeLyrics : mockLyrics;
}

export function musicProvider() {
  return config.musicProvider === "gemini-lyria" ? geminiMusic : mockMusic;
}
