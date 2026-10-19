import crypto from "node:crypto";

/**
 * In-memory data store. This is the mock/dev backing for the whole API so the
 * app runs with no external services. The same function surface is what a
 * Supabase-backed implementation would expose, so swapping it out later does
 * not touch the routes. Balances are DERIVED from the credit ledger, never
 * stored as a mutable number — the prompt's rule.
 */

export const uid = (p = "") => p + crypto.randomUUID();
const now = () => new Date().toISOString();

const DEFAULTS = {
  plan: "free",
  voiceSlotsMax: 3,
  startingCredits: 1200, // granted once as a ledger entry on first sight
};

// userId -> { profile, voices[], lyrics[], songs[], jobs[], ledger[], consents[], usage[] }
const users = new Map();

export function resetStore() {
  users.clear();
}

export function getUser(tgUser) {
  const id = String(tgUser.id);
  let u = users.get(id);
  if (!u) {
    u = {
      profile: {
        id,
        displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || tgUser.username || "អ្នកប្រើ",
        avatarUrl: tgUser.photo_url ?? null,
        plan: DEFAULTS.plan,
        voiceSlotsMax: DEFAULTS.voiceSlotsMax,
        settings: {
          engineVoice: "mock",
          engineMusic: "mock",
          exportQuality: "standard",
          watermark: true,
          publicProfile: false,
          language: tgUser.language_code === "en" ? "en" : "km",
        },
      },
      voices: [],
      lyrics: [],
      songs: [],
      jobs: [],
      ledger: [],
      consents: [],
      usage: [],
    };
    // Grant the one-time starting credits as a ledger entry.
    u.ledger.push({ id: uid("led_"), delta: DEFAULTS.startingCredits, reason: "signup_grant", jobId: null, createdAt: now() });
    users.set(id, u);
  }
  return u;
}

// ── Credit ledger ────────────────────────────────────────────────────────────
export function creditBalance(u) {
  return u.ledger.reduce((sum, e) => sum + e.delta, 0);
}

/** Atomically deduct credits; throws { code: "insufficient_credits" } if the
 * resulting balance would go negative. Returns the ledger entry. */
export function deductCredits(u, amount, reason, jobId = null) {
  if (amount < 0) throw new Error("amount must be positive");
  const balance = creditBalance(u);
  if (balance < amount) {
    const err = new Error("ក្រេឌីតមិនគ្រប់គ្រាន់");
    err.code = "insufficient_credits";
    throw err;
  }
  const entry = { id: uid("led_"), delta: -amount, reason, jobId, createdAt: now() };
  u.ledger.push(entry);
  return entry;
}

/** Refund a previously deducted amount (e.g. when a job fails). */
export function refundCredits(u, amount, reason, jobId = null) {
  if (amount <= 0) return null;
  const entry = { id: uid("led_"), delta: amount, reason, jobId, createdAt: now() };
  u.ledger.push(entry);
  return entry;
}

// ── Consent ──────────────────────────────────────────────────────────────────
/** Record a consent statement for a voice. Required before a voice is saved. */
export function recordConsent(u, { voiceId, statementText, ipHash = null }) {
  const c = { id: uid("cns_"), voiceId, statementText, ipHash, acceptedAt: now() };
  u.consents.push(c);
  return c;
}

export function hasConsent(u, voiceId) {
  return u.consents.some((c) => c.voiceId === voiceId);
}

// ── Rate limiting ────────────────────────────────────────────────────────────
export function countJobsToday(u) {
  const dayAgo = Date.now() - 86400_000;
  return u.jobs.filter((j) => new Date(j.createdAt).getTime() > dayAgo).length;
}

export function voiceSlotsUsed(u) {
  return u.voices.filter((v) => v.status !== "failed").length;
}

export { now };
