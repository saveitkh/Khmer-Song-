// Shared API types — mirror the server's Zod schemas (server/src/routes/*).

export type Plan = "free" | "vip";

export interface Me {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  plan: Plan;
  creditsBalance: number;
  voiceSlotsUsed: number;
  voiceSlotsMax: number;
  settings: UserSettings;
}

export interface UserSettings {
  engineVoice: "mock" | "voxcpm2" | "gemini-tts";
  engineMusic: "mock" | "gemini-lyria";
  exportQuality: "standard" | "high";
  watermark: boolean;
  publicProfile: boolean;
  language: "km" | "en";
}

export type VoiceStatus = "recording" | "processing" | "ready" | "failed";

export interface Voice {
  id: string;
  name: string;
  language: string;
  status: VoiceStatus;
  style: string | null;
  quality: { matchPct: number | null; noiseDb: number | null } | null;
  isPublic: boolean;
  sampleUrl: string | null;
  durationS: number | null;
  createdAt: string;
}

export interface LyricLine {
  text: string;
  syllables: number;
  highlights: number[]; // indices of rhyme words within the line
}
export interface LyricSection {
  kind: "verse" | "chorus" | "bridge" | "intro" | "outro";
  label: string;
  lines: LyricLine[];
}
export interface Lyrics {
  id: string;
  prompt: string;
  mood: string;
  genre: string;
  sections: LyricSection[];
  model: string;
  createdAt: string;
}

export interface SongStem {
  kind: "vocal" | "backing" | "lrc";
  url: string | null;
  format: string;
}
export interface Song {
  id: string;
  title: string;
  artistName: string;
  mood: string;
  genre: string;
  bpm: number | null;
  key: string | null;
  durationS: number | null;
  coverUrl: string | null;
  masterUrl: string | null;
  stems: SongStem[];
  provider: string;
  status: JobStatus;
  aiGenerated: boolean;
  createdAt: string;
}

export type JobType = "voice_preview" | "lyrics" | "song";
export type JobStatus = "queued" | "processing" | "done" | "failed" | "canceled";
export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0..100
  error: string | null;
  output: unknown | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface TrendingVoice {
  id: string;
  name: string;
  style: string;
  sampleTitle: string;
  durationS: number;
  avatarUrl: string | null;
  sampleUrl: string | null;
}

export interface Project {
  id: string;
  kind: "song" | "lyrics";
  title: string;
  subtitle: string;
  badge: string | null;
  createdAt: string;
}
