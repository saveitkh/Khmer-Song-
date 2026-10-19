import { uid, now, deductCredits, refundCredits } from "./store.js";
import { voiceProvider, lyricsProvider, musicProvider } from "./providers/index.js";
import { config } from "./config.js";

// Credit cost per job type. Tune against real provider pricing before launch.
export const COST = { lyrics: 10, voice_preview: 20, song: 150 };

const KILL = {
  voice_preview: () => config.killswitch.voice,
  lyrics: () => config.killswitch.lyrics,
  song: () => config.killswitch.music,
};

function makeJob(type, input) {
  return {
    id: uid("job_"),
    type,
    status: "queued",
    progress: 0,
    input,
    output: null,
    error: null,
    cost_credits: COST[type] ?? 0,
    createdAt: now(),
    finishedAt: null,
  };
}

/**
 * Create a job: enforce kill-switch, deduct credits atomically, push it, and
 * run it asynchronously (resolving the provider). Returns the job immediately
 * (status queued/processing) so the client can poll GET /jobs/:id.
 */
export function startJob(u, type, input, run) {
  if (KILL[type]?.()) {
    const err = new Error("មុខងារនេះត្រូវបានផ្អាកបណ្ដោះអាសន្ន");
    err.code = "killswitch";
    throw err;
  }
  const job = makeJob(type, input);
  // Atomic deduct — throws insufficient_credits before any work starts.
  deductCredits(u, job.cost_credits, `job:${type}`, job.id);
  u.jobs.push(job);

  // Run async; never block the request.
  queueMicrotask(async () => {
    job.status = "processing";
    job.progress = 15;
    try {
      // A short staged delay so polling shows real progress movement.
      await delay(600);
      job.progress = 55;
      const output = await run();
      job.progress = 100;
      job.output = output;
      job.status = "done";
      job.finishedAt = now();
    } catch (e) {
      job.status = "failed";
      job.error = e?.message ?? "បរាជ័យ";
      job.finishedAt = now();
      // Refund on failure so users are not charged for nothing.
      refundCredits(u, job.cost_credits, `refund:${type}`, job.id);
    }
  });

  return job;
}

export function findJob(u, id) {
  return u.jobs.find((j) => j.id === id) ?? null;
}

// ── Typed runners ────────────────────────────────────────────────────────────
export function runLyricsJob(u, { prompt, mood, genre, structure }) {
  return startJob(u, "lyrics", { prompt, mood, genre }, async () => {
    const out = await lyricsProvider().generate({ prompt, mood, genre, structure });
    const rec = {
      id: uid("lyr_"),
      prompt,
      mood,
      genre,
      sections: out.sections,
      model: out.model,
      createdAt: now(),
    };
    u.lyrics.push(rec);
    return { lyricsId: rec.id };
  });
}

export function runVoicePreviewJob(u, voice, text) {
  return startJob(u, "voice_preview", { voiceId: voice.id, text }, async () => {
    const out = await voiceProvider().preview({
      referenceKey: voice.reference_r2_key ?? null,
      transcript: voice.transcript ?? "",
      text,
    });
    return { url: out.url, durationS: out.durationS };
  });
}

export function runSongJob(u, song, lyrics, { style, instrumental }) {
  return startJob(u, "song", { songId: song.id, lyricsId: lyrics.id, style }, async () => {
    let out;
    try {
      out = await musicProvider().generate({ lyrics, style, instrumental });
    } catch (e) {
      song.status = "failed"; // so GET /songs/:id stops the client polling
      throw e;
    }
    Object.assign(song, {
      provider: out.provider,
      masterUrl: out.masterUrl,
      coverUrl: out.coverUrl,
      bpm: out.bpm,
      key: out.key,
      durationS: out.durationS,
      stems: out.stems ?? [],
      status: "done",
      aiGenerated: true, // every engine output is AI; watermark applied downstream
    });
    return { songId: song.id };
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
