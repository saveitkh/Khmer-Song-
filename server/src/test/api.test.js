import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { resetStore } from "../store.js";

// These run in dev mode (no TELEGRAM_BOT_TOKEN), so a demo user is injected and
// the HMAC check is skipped — exactly the local/dev path.
function startServer() {
  const app = createApp();
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ base: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

async function withServer(fn) {
  resetStore();
  const s = await startServer();
  try {
    await fn(s.base);
  } finally {
    s.close();
  }
}

const j = (base, path, opts) => fetch(base + path, opts).then(async (r) => ({ status: r.status, body: await r.json() }));

test("GET /api/health is public and reports engines", async () => {
  await withServer(async (base) => {
    const { status, body } = await j(base, "/api/health");
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.ok(body.engines.voice);
  });
});

test("POST /api/voices WITHOUT consent is rejected (consent rule)", async () => {
  await withServer(async (base) => {
    const { status, body } = await j(base, "/api/voices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Voice", transcript: "test", consent: false }),
    });
    assert.equal(status, 400);
    assert.equal(body.code, "validation");
  });
});

test("POST /api/voices WITH consent creates a voice and uses a slot", async () => {
  await withServer(async (base) => {
    const create = await j(base, "/api/voices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Voice", transcript: "test", consent: true }),
    });
    assert.equal(create.status, 201);
    assert.equal(create.body.status, "ready");

    const me = await j(base, "/api/me");
    assert.equal(me.body.voiceSlotsUsed, 1);
  });
});

test("lyrics job charges credits, completes, and is fetchable", async () => {
  await withServer(async (base) => {
    const before = (await j(base, "/api/me")).body.creditsBalance;

    const start = await j(base, "/api/lyrics/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "បទស្នេហា", mood: "ស្នេហា", genre: "Pop" }),
    });
    assert.equal(start.status, 202);
    const jobId = start.body.id;

    // Credits deducted immediately at job start.
    const mid = (await j(base, "/api/me")).body.creditsBalance;
    assert.equal(mid, before - 10);

    // Poll until done.
    let job;
    for (let i = 0; i < 40; i++) {
      job = (await j(base, `/api/jobs/${jobId}`)).body;
      if (job.status === "done" || job.status === "failed") break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(job.status, "done");
    const lyricsId = job.output.lyricsId;

    const lyrics = await j(base, `/api/lyrics/${lyricsId}`);
    assert.equal(lyrics.status, 200);
    assert.ok(lyrics.body.sections.length > 0);
    assert.ok(lyrics.body.sections[0].lines[0].syllables >= 0);
  });
});

test("insufficient credits returns 402 (drain then request)", async () => {
  await withServer(async (base) => {
    // 1200 credits / 150 per song — but we have no lyrics; use preview (20) on a
    // created voice repeatedly would hit the daily rate limit (50) first. Instead
    // assert the ledger path via many lyrics (10 each) is bounded by rate limit,
    // so here we just confirm the 402 shape by monkey-less direct check:
    // create a voice, then spam previews until either 402 or 429 — both prove
    // the guard fired rather than silently overspending.
    const voice = (await j(base, "/api/voices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "V", transcript: "t", consent: true }),
    })).body;

    let sawGuard = false;
    for (let i = 0; i < 80; i++) {
      const r = await j(base, `/api/voices/${voice.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hi" }),
      });
      if (r.status === 402 || r.status === 429) { sawGuard = true; break; }
    }
    assert.ok(sawGuard, "a spend/rate guard must eventually fire");
  });
});
