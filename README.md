# Khmer Sonic AI 🎵

A mobile-first **Telegram Mini App** (and installable PWA) for Khmer voice
cloning, Khmer lyric writing, and AI song creation. UI language: **Khmer**.

It is one of several Mini Apps opened from a single Telegram bot (in the
[`saveitkh/project1`](https://github.com/saveitkh/project1) repo) — the same
pattern as that bot's Dubbing Studio: a separate service, its own container,
opened from its own button.

> **Status:** UI + bot integration + VPS deploy scaffold are production-ready.
> Song/voice generation ships on a **mock engine** so the whole app runs and
> deploys with zero keys. Real engines (Claude lyrics, Gemini Lyria songs,
> VoxCPM2 voice clone) are wired behind provider interfaces and switched on per
> `.env` once their keys are set **and the Khmer-quality evaluation is signed
> off** (see `design/BUILD_PROMPT.md` §6).

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind, PWA (`vite-plugin-pwa`) | Design tokens ported verbatim from the Stitch export; installable + offline-aware |
| Audio | `wavesurfer.js` (lazy) + Web Audio `AnalyserNode` + `MediaRecorder` | Waveforms and the live recording frequency meter |
| API | **Node + Express (ESM)**, Zod on every route | One runtime, one `npm install`, serves the PWA *and* the API from a single container — the simplest fit for a VPS, and consistent with the bot repo's Node style |
| Auth | Telegram Mini App `initData` (HMAC-verified server-side) | No separate login; the signed user id is trusted only after verification |
| Engines | `VoiceProvider` / `LyricsProvider` / `MusicProvider` interfaces with `mock` + real adapters | Swap engines by env with no route changes |

Fonts: Plus Jakarta Sans (Latin) + Kantumruy Pro (Khmer). Khmer text uses a ≥1.5
line-height so stacked sub-consonants and diacritics never clip.

## Layout

```
web/                 React PWA (6 screens + nav)
  src/screens/       Home, SoundClone, Recording, SampleComparison,
                     LyricGenerator, SongProfile, Settings
  src/components/    TopBar, BottomNav, Waveform, shared UI, state views
  src/telegram.ts    Telegram WebApp SDK wrapper (degrades to plain PWA)
  src/api.ts         fetch client (sends X-Telegram-Init-Data) + job polling
server/              Node + Express API
  src/app.js         express app (serves web/dist + /api)
  src/telegramAuth.js initData HMAC verification
  src/routes.js      /me /voices /lyrics /songs /jobs /uploads /library
  src/jobs.js        async job runner + credit ledger charge/refund
  src/store.js       in-memory store (mock backing; same surface as Supabase)
  src/providers/     mock + claude + gemini (lyria/tts) + voxcpm2 adapters
  src/test/          credit-ledger + consent + job-flow tests
design/              the Stitch UI export + the original BUILD_PROMPT.md
Dockerfile           multi-stage: build PWA, run Node serving dist + API
```

## Develop

```bash
npm install
npm run dev          # web on :5173 (proxies /api to the server on :3000)
# in another shell, or rely on the concurrent runner:
npm run dev:api
```

With no `TELEGRAM_BOT_TOKEN`, the server runs in **dev mode**: a demo user is
injected and the initData check is skipped. Never deploy like that.

Build + run as production does:

```bash
npm run build        # -> web/dist
npm start            # Node serves web/dist + /api on :3000
```

Tests:

```bash
npm test             # credit ledger (atomic deduct/refund) + consent + job flow
```

## Configuration

Copy `.env.example` to `.env`. Everything defaults to the mock engine; nothing
is required to run. To go live, set `TELEGRAM_BOT_TOKEN` (same token as the
bot), then per engine set its key and flip its `*_PROVIDER` var. No provider key
ever reaches the browser — the PWA only talks to this API.

## Safety & consent (built in, not optional)

- Voice cloning is for the user's **own** voice: a consent checkbox **and** a
  live-read of an on-screen Khmer script are required before a voice is saved;
  the consent record is stored. The API rejects a voice without `consent: true`.
- Generated audio is tagged **AI-generated** and watermarked (default on).
- Public "trending" voices are opt-in with immediate revoke.
- Per-user daily rate limit, a global daily spend cap, and a per-provider
  kill-switch are enforced in the API (not just the gateway).

See [`DEPLOY.md`](./DEPLOY.md) for putting it on the VPS behind the bot.
