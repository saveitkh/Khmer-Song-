import { Router } from "express";
import { z } from "zod";
import { config, enginesSummary } from "./config.js";
import {
  getUser, creditBalance, voiceSlotsUsed, recordConsent, countJobsToday, uid, now,
} from "./store.js";
import { findJob, runLyricsJob, runVoicePreviewJob, runSongJob } from "./jobs.js";
import { presignUpload } from "./r2.js";

export const api = Router();

// ── helpers ──────────────────────────────────────────────────────────────────
function errorStatus(code) {
  switch (code) {
    case "insufficient_credits": return 402;
    case "killswitch": return 423;
    case "rate_limited": return 429;
    case "not_found": return 404;
    case "file_too_large": return 413;
    case "validation": return 400;
    default:
      return /not_configured|needs_evaluation|not_implemented|worker_/.test(code ?? "") ? 501 : 500;
  }
}

// Async wrapper that catches BOTH synchronous throws (e.g. zod parse, credit
// deduction) and rejected promises, so every error becomes a JSON response
// instead of Express's default HTML error page.
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    res.status(errorStatus(e.code)).json({ code: e.code ?? "error", message: e.message ?? "មានបញ្ហា" });
  }
};

function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const err = new Error(r.error.issues.map((i) => i.message).join("; "));
    err.code = "validation";
    throw err;
  }
  return r.data;
}

const notFound = (msg = "រកមិនឃើញ") => {
  const e = new Error(msg);
  e.code = "not_found";
  return e;
};

function enforceRateLimit(u) {
  if (countJobsToday(u) >= config.rateLimitPerUserPerDay) {
    const e = new Error("បានប្រើប្រាស់ដល់កម្រិតប្រចាំថ្ងៃ — សូមព្យាយាមថ្ងៃស្អែក");
    e.code = "rate_limited";
    throw e;
  }
}

// ── serializers ───────────────────────────────────────────────────────────────
const sMe = (u) => ({
  id: u.profile.id,
  displayName: u.profile.displayName,
  avatarUrl: u.profile.avatarUrl,
  plan: u.profile.plan,
  creditsBalance: creditBalance(u),
  voiceSlotsUsed: voiceSlotsUsed(u),
  voiceSlotsMax: u.profile.voiceSlotsMax,
  settings: u.profile.settings,
});
const sVoice = (v) => ({
  id: v.id, name: v.name, language: v.language, status: v.status, style: v.style,
  quality: v.quality, isPublic: v.isPublic, sampleUrl: v.sampleUrl,
  durationS: v.durationS, createdAt: v.createdAt,
});
const sJob = (j) => ({
  id: j.id, type: j.type, status: j.status, progress: j.progress,
  error: j.error, output: j.output, createdAt: j.createdAt, finishedAt: j.finishedAt,
});
const sLyrics = (l) => ({
  id: l.id, prompt: l.prompt, mood: l.mood, genre: l.genre,
  sections: l.sections, model: l.model, createdAt: l.createdAt,
});
const sSong = (s) => ({
  id: s.id, title: s.title, artistName: s.artistName, mood: s.mood, genre: s.genre,
  bpm: s.bpm, key: s.key, durationS: s.durationS, coverUrl: s.coverUrl,
  masterUrl: s.masterUrl, stems: s.stems, provider: s.provider, status: s.status,
  aiGenerated: s.aiGenerated, createdAt: s.createdAt,
});

// ── health (no auth; mounted before auth in index.js) ─────────────────────────
export const health = Router();
health.get("/health", (_req, res) => res.json({ ok: true, engines: enginesSummary() }));

// ── me ─────────────────────────────────────────────────────────────────────────
api.get("/me", wrap((req, res) => res.json(sMe(getUser(req.tgUser)))));

const SettingsPatch = z.object({
  engineVoice: z.enum(["mock", "voxcpm2", "gemini-tts"]).optional(),
  engineMusic: z.enum(["mock", "gemini-lyria"]).optional(),
  exportQuality: z.enum(["standard", "high"]).optional(),
  watermark: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
  language: z.enum(["km", "en"]).optional(),
}).strict();

api.patch("/me/settings", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const patch = parse(SettingsPatch, req.body ?? {});
  u.profile.settings = { ...u.profile.settings, ...patch };
  res.json(sMe(u));
}));

api.post("/me/cache/purge", wrap((req, res) => {
  const u = getUser(req.tgUser);
  // Drop cached preview/output URLs; real impl also deletes temp R2 objects.
  u.songs.forEach((s) => { if (s.status !== "done") s.status = "canceled"; });
  res.json({ ok: true });
}));

// ── voices ─────────────────────────────────────────────────────────────────────
api.get("/voices", wrap((req, res) => {
  const u = getUser(req.tgUser);
  res.json({ voices: u.voices.map(sVoice) });
}));

api.get("/voices/:id", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const v = u.voices.find((x) => x.id === req.params.id);
  if (!v) throw notFound();
  res.json(sVoice(v));
}));

const CreateVoice = z.object({
  name: z.string().min(1, "ត្រូវការឈ្មោះ").max(60),
  style: z.string().max(40).optional(),
  transcript: z.string().max(500).default(""),
  consent: z.literal(true, { errorMap: () => ({ message: "ត្រូវការការយល់ព្រម (consent)" }) }),
  refKey: z.string().max(300).optional(),
});

api.post("/voices", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const body = parse(CreateVoice, req.body ?? {});
  // Consent + slot enforcement — the core safety rule.
  if (voiceSlotsUsed(u) >= u.profile.voiceSlotsMax) {
    const e = new Error("កូតាសំឡេងពេញ — សូមលុបម៉ូដែលចាស់ ឬដំឡើង VIP");
    e.code = "validation";
    throw e;
  }
  const v = {
    id: uid("voc_"),
    name: body.name,
    language: "khm",
    status: "ready", // mock: ready immediately; real mode → processing then ready
    style: body.style ?? null,
    quality: null, // only ever set from real engine metrics
    isPublic: false,
    sampleUrl: null,
    durationS: null,
    reference_r2_key: body.refKey ?? null,
    transcript: body.transcript,
    createdAt: now(),
  };
  u.voices.push(v);
  recordConsent(u, { voiceId: v.id, statementText: body.transcript });
  res.status(201).json(sVoice(v));
}));

api.delete("/voices/:id", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const i = u.voices.findIndex((x) => x.id === req.params.id);
  if (i === -1) throw notFound();
  u.voices.splice(i, 1); // real impl also deletes the R2 objects
  res.json({ ok: true });
}));

const Preview = z.object({ text: z.string().min(1).max(300) });
api.post("/voices/:id/preview", wrap((req, res) => {
  const u = getUser(req.tgUser);
  enforceRateLimit(u);
  const v = u.voices.find((x) => x.id === req.params.id);
  if (!v) throw notFound();
  const { text } = parse(Preview, req.body ?? {});
  res.status(202).json(sJob(runVoicePreviewJob(u, v, text)));
}));

// ── lyrics ─────────────────────────────────────────────────────────────────────
const GenLyrics = z.object({
  prompt: z.string().min(1, "ត្រូវការ prompt").max(400),
  mood: z.string().max(40).default(""),
  genre: z.string().max(40).default(""),
  structure: z.array(z.string()).max(12).optional(),
});
api.post("/lyrics/generate", wrap((req, res) => {
  const u = getUser(req.tgUser);
  enforceRateLimit(u);
  const body = parse(GenLyrics, req.body ?? {});
  res.status(202).json(sJob(runLyricsJob(u, body)));
}));

api.get("/lyrics/:id", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const l = u.lyrics.find((x) => x.id === req.params.id);
  if (!l) throw notFound();
  res.json(sLyrics(l));
}));

// ── songs ──────────────────────────────────────────────────────────────────────
const CreateSong = z.object({
  lyricsId: z.string().min(1),
  voiceId: z.string().nullable().optional(),
  style: z.string().max(40).default(""),
  instrumental: z.boolean().optional(),
});
api.post("/songs", wrap((req, res) => {
  const u = getUser(req.tgUser);
  enforceRateLimit(u);
  const body = parse(CreateSong, req.body ?? {});
  const lyrics = u.lyrics.find((x) => x.id === body.lyricsId);
  if (!lyrics) throw notFound("រកមិនឃើញទំនុកច្រៀង");
  const title = lyrics.sections?.[0]?.lines?.[0]?.text?.slice(0, 30) || "បទថ្មី";
  const song = {
    id: uid("sng_"),
    title,
    artistName: u.profile.displayName,
    mood: lyrics.mood,
    genre: body.style || lyrics.genre,
    bpm: null, key: null, durationS: null,
    coverUrl: null, masterUrl: null, stems: [],
    provider: config.musicProvider,
    status: "processing",
    aiGenerated: true,
    lyricsId: lyrics.id,
    voiceId: body.voiceId ?? null,
    createdAt: now(),
  };
  u.songs.push(song);
  const job = runSongJob(u, song, lyrics, { style: body.style, instrumental: body.instrumental });
  res.status(202).json({ ...sJob(job), output: { songId: song.id } });
}));

api.get("/songs", wrap((req, res) => {
  const u = getUser(req.tgUser);
  res.json({ songs: u.songs.map(sSong) });
}));

api.get("/songs/:id", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const s = u.songs.find((x) => x.id === req.params.id);
  if (!s) throw notFound();
  res.json(sSong(s));
}));

// ── jobs ───────────────────────────────────────────────────────────────────────
api.get("/jobs/:id", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const j = findJob(u, req.params.id);
  if (!j) throw notFound();
  res.json(sJob(j));
}));

api.post("/jobs/:id/cancel", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const j = findJob(u, req.params.id);
  if (!j) throw notFound();
  if (j.status === "queued" || j.status === "processing") {
    j.status = "canceled";
    j.finishedAt = now();
  }
  res.json(sJob(j));
}));

// ── uploads ──────────────────────────────────────────────────────────────────
const Presign = z.object({
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  kind: z.string().min(1).max(40),
});
api.post("/uploads/presign", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const body = parse(Presign, req.body ?? {});
  res.json(presignUpload({ userId: u.profile.id, ...body }));
}));

// ── library ──────────────────────────────────────────────────────────────────
// Demo catalog for the Home screen. These carry NO invented quality metrics;
// a real public library (opt-in voices) replaces this. Flagged demo in README.
const TRENDING = [
  { id: "demo_sophea", name: "សុភា • Sophea", style: "Soft Pop", sampleTitle: "ផ្កាស្លា", durationS: 45, avatarUrl: null, sampleUrl: null },
  { id: "demo_bopha", name: "បុប្ផា • Bopha", style: "Acoustic", sampleTitle: "ស្ទឹងសង្កែរង់ចាំ", durationS: 72, avatarUrl: null, sampleUrl: null },
];
api.get("/library/trending", wrap((_req, res) => res.json({ voices: TRENDING })));

api.get("/library/recent", wrap((req, res) => {
  const u = getUser(req.tgUser);
  const projects = [
    ...u.songs.map((s) => ({
      id: s.id, kind: "song", title: s.title,
      subtitle: `${s.provider} · ${s.genre}`,
      badge: s.status === "done" ? "Mastered" : null, createdAt: s.createdAt,
    })),
    ...u.lyrics.map((l) => ({
      id: l.id, kind: "lyrics", title: l.sections?.[0]?.lines?.[0]?.text?.slice(0, 24) || "ទំនុកច្រៀង",
      subtitle: `${l.sections.length} វគ្គ · ${l.genre}`, badge: "ព្រាង", createdAt: l.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  res.json({ projects });
}));
