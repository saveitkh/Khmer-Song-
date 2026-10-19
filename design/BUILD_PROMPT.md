# Prompt for Claude Code — Khmer Sonic AI (UX/UI + Backend)

> Copy everything below the line into Claude Code. First put the unzipped Stitch folder into the repo at `./design/stitch_khmer_ai_audio_app_ui/`.

---

You are building **Khmer Sonic AI**, a mobile-first web app (installable PWA) for Khmer voice cloning, Khmer lyric writing, and AI song creation. The UI language is **Khmer**. Build the real UX/UI **and** the backend.

## 0. How to work
1. Read `design/stitch_khmer_ai_audio_app_ui/khmer_sonic_studio/DESIGN.md` (design tokens) and every `code.html` + `screen.png` in that folder. These are the visual source of truth. (`khmer_sonic_ai_studio` and `home_studio_hub` are duplicates of the Home screen.)
2. Before writing code, reply with a short plan: stack, folder layout, phases, and any questions in section 12. Then proceed phase by phase (section 11). Commit after each phase.
3. Never hard-code secrets. Never put a provider API key in frontend code, a public env var, or git. Provide `.env.example` only.
4. Everything the mockups show as fake data (user "សុធារី ជា", "VIP", "3/5 slots", "1,250 credits", "98.4% match", "Mastered", latency numbers, etc.) must come from real data or be removed. Do not ship invented metrics.

## 1. Screens to build (from the design files)
| Screen (folder) | What it does |
|---|---|
| Home (`home_studio_hub`) | Greeting, voice-slot quota, two entry cards (clone voice / write lyrics), trending voices with play + waveform, recent projects, tip card |
| Sound Clone (`sound_clone_studio`, `active_recording_frequency_meter`) | Show a Khmer script to read, record up to ~30 s in-browser with live frequency meter + noise/quality indicator, preview, re-record, save voice, export WAV |
| Sample Comparison (`sample_comparison_original_vs_cloned`) | A/B switch + dual play of original vs cloned sample, quality scores, Accept & Save / re-record |
| Lyric Generator (`lyric_generator`) | Prompt + mood/genre chips → Khmer lyrics (verse/chorus/bridge), highlighted rhyme words, syllable count per line, copy/share, send to song generation |
| Song Profile (`song_profile_auto_display`) | Result page: cover art, title/artist (editable), mood, BPM, key, master player, stems (vocal / backing / synced lyrics), engine info, download, share |
| Settings (`studio_settings`) | Profile, voice quota, credits, engine selection, export quality, privacy (watermark toggle, delete cached audio), help, sign out |

Bottom nav: Home · Clone · Lyrics · Settings. Implement loading, empty, error, and offline states for every screen (the mockups only show the happy path).

## 2. Recommended stack (change only with a stated reason)
- **Frontend:** React + Vite + TypeScript + Tailwind (the mockups are Tailwind with Material Symbols; port the config from the `code.html` files and DESIGN.md tokens), PWA via `vite-plugin-pwa`. Fonts: Plus Jakarta Sans (Latin) + a Khmer font (the designs reference Kantumruy Pro / Battambang). Use `wavesurfer.js` for waveforms and the Web Audio `AnalyserNode` for the live frequency meter. Record with `MediaRecorder` (prefer WAV/PCM via AudioWorklet, fallback webm/opus).
- **API:** TypeScript on **Hono** (Cloudflare Workers) *or* Node on Railway — pick one and justify. Zod validation on every route.
- **Auth + DB:** **Supabase** (Auth, Postgres, Row Level Security on every table).
- **Object storage:** **Cloudflare R2** (private buckets, S3 API, presigned URLs).
- **Jobs/queue:** Cloudflare Queues or Redis + BullMQ. Long jobs (clone, lyrics, song) are async: `POST` returns a job id, the client polls `GET /jobs/:id` (or SSE).
- **Voice engine (self-hosted GPU worker):** **VoxCPM2** (openbmb/VoxCPM2, Apache-2.0, 30 languages incl. Khmer, 48 kHz output, ~8 GB VRAM, CUDA ≥ 12). Wrap it in a small FastAPI service with endpoints for *voice design*, *controllable cloning* (short reference clip), and *ultimate cloning* (reference + transcript). Deploy on a serverless GPU (Modal / RunPod / Replicate) or the owner's own GPU box; the API calls it over HTTPS with a shared secret. Never expose the GPU worker publicly.
- **Lyrics LLM:** Claude API (Khmer lyric generation + rhyme/syllable analysis returned as structured JSON).
- **Song engine:** Gemini Lyria 3.5 by default, behind a `MusicProvider` interface (see section 6).
- **LLM gateway:** Cloudflare AI Gateway in front of all LLM calls (see section 7).

## 3. Architecture
```
PWA (React) ──HTTPS──> API (Hono/Node) ──> Supabase (auth, DB)
     │                      │──> R2 (audio, stems, covers)  [presigned URLs only]
     │ direct PUT/GET       │──> Queue ──> Workers:
     └──(presigned R2)──────┘        ├─ VoxCPM2 GPU service (clone / TTS)
                                      ├─ Lyrics via AI Gateway ─> Claude
                                      └─ MusicProvider adapter (song + stems)
```
The browser never talks to any AI provider directly and never sees any provider key.

## 4. Data model (Supabase / Postgres, RLS: users access only their own rows)
- `profiles` (id = auth.uid, display_name, avatar_url, plan, credits_balance, voice_slots_used, voice_slots_max, settings jsonb)
- `voices` (id, user_id, name, language, status [recording|processing|ready|failed], reference_r2_key, transcript, quality jsonb, consent_id, is_public, created_at)
- `consents` (id, user_id, voice_id, statement_text, verification_audio_r2_key, accepted_at, ip_hash)
- `lyrics` (id, user_id, prompt, mood, genre, content jsonb [sections→lines→{text, syllables, highlights}], model, created_at)
- `songs` (id, user_id, voice_id, lyrics_id, title, artist_name, bpm, key, mood, duration_s, master_r2_key, cover_r2_key, status, provider, created_at)
- `song_stems` (id, song_id, kind [vocal|backing|lrc], r2_key, format)
- `jobs` (id, user_id, type, status, progress, input jsonb, output jsonb, error, cost_credits, created_at, finished_at)
- `credit_ledger` (id, user_id, delta, reason, job_id, created_at) — balance is derived/verified from the ledger; deduct atomically when a job starts, refund on failure.
- `usage_events` (for rate limiting + abuse review)

## 5. API surface (all authenticated except health)
- `POST /uploads/presign` → presigned R2 PUT (validate type, size ≤ 20 MB, key namespaced by user id)
- `POST /voices` · `GET /voices` · `GET /voices/:id` · `DELETE /voices/:id` (delete removes R2 objects too)
- `POST /voices/:id/preview` (synthesize the sample sentence with the cloned voice → returns job)
- `POST /lyrics/generate` (prompt, mood, genre, structure) → structured JSON lyrics
- `POST /songs` (lyrics_id, voice_id, style) → job · `GET /songs/:id` · `GET /songs`
- `GET /jobs/:id` (status/progress) · `POST /jobs/:id/cancel`
- `GET /me` · `PATCH /me/settings` · `POST /me/cache/purge` (the "delete cached audio" setting)
- `GET /library/trending` (public voices only, opt-in)
- Return audio via **short-lived signed R2 URLs (≤ 10 min)**; never public buckets.

## 6. Song generation — Gemini (Lyria) as the default engine
**Suno has no official public API** (only a partner-program intake; online "Suno API" services are unofficial wrappers). Do not build on them. The mockups say "Suno"; rename that label to a neutral "Song Engine" (brand names live in config only).

**Default: Google Gemini API, using one API key from Google AI Studio (not Cloud Console).**
- **Songs:** Lyria 3.5 (`lyria-3.5`, ~2 min songs with vocals + lyrics, 44.1 kHz stereo, MP3/WAV) and Lyria 3 Clip (`lyria-3-clip-preview`, 30 s). Called through the Gemini **Interactions API**. Custom lyrics use `[Verse]`, `[Chorus]`, `[Bridge]` tags; add "no vocals" for instrumental/backing-only tracks. Output includes a SynthID watermark (satisfies the "AI voice protection" toggle for song output). Requests for specific artists' voices and copyrighted lyrics are blocked.
- **Known limits to design around:** Lyria's docs do **not** list Khmer as a supported singing language, accept **no reference audio / voice cloning**, and don't support editing a generated track (single-turn, outputs vary run to run). So: (1) run a Khmer test first — same 3 lyric sets, 3 genres — and report whether Lyria's Khmer pronunciation is usable; (2) the app must treat Lyria's singer as "AI voice", not the user's cloned voice; (3) regenerate = new job.
- **Gemini TTS** (Gemini API, 100+ languages **including Khmer**, voice replication, voice design, WAV output) can serve as an alternative or fallback to the self-hosted VoxCPM2 for the *speaking* clone. Build `VoiceProvider` with two adapters (`voxcpm2`, `gemini-tts`) and compare Khmer quality, latency, cost, and consent/policy fit before choosing the default.

**Making a song in the user's own voice (optional phase, behind a flag):** no provider here sings in a cloned voice directly, so use a pipeline:
1. Generate the song with Lyria (or instrumental only + a guide vocal).
2. Separate vocal and backing stems with Demucs on the GPU worker.
3. Convert the vocal stem to the user's voice with a singing-voice-conversion model (evaluate RVC / Seed-VC or similar; zero-shot from the user's consented reference clip, or a short per-user fine-tune).
4. Re-mix with the backing stem, loudness-normalize, run librosa/essentia for BPM/key, write master + stems to R2.
This needs real listening tests; do not promise quality until tested. Same consent record as voice cloning applies.

**Architecture:** `MusicProvider` interface (`generate(lyrics, style, instrumental?) → {master, stems?, bpm?, key?}`) with adapters `gemini-lyria` (default), `open-source` (ACE-Step / YuE / DiffRhythm on the GPU worker, evaluate only), and `mock` (fixture, so the whole UI can be built now). Check current Gemini pricing/quotas and add per-user credit costs and a daily spend cap before launch.

## 7. API keys and the gateway
- **All provider keys live only on the server** (Worker secrets / Railway variables / Supabase secrets). Frontend only holds the Supabase anon key and the API base URL.
- Route every LLM call through **Cloudflare AI Gateway**: stored provider keys (BYOK), request logs, caching of repeat prompts, rate limiting, and fallback. The API sends `cf-aig-authorization` and omits the provider key header when BYOK is used. Verify which providers the gateway supports in the current Cloudflare docs before relying on it for non-LLM providers.
- The gateway does **not** replace your own API: user-facing auth, per-user rate limits, credit checks, and consent checks stay in your backend.
- Add per-user and per-IP rate limits, a global daily spend cap, and a kill-switch env var per provider.

## 8. Cloudflare R2 usage
- Buckets: `ks-voice-refs` (raw recordings, private), `ks-outputs` (songs, stems, covers, private). No public access.
- Upload and download only through presigned URLs created by the API after an auth + ownership check. Key layout: `{user_id}/{type}/{uuid}.{ext}`.
- Lifecycle rules: auto-delete temp recordings after 24–72 h unless the user saved the voice; deleting a voice/song deletes its objects.
- Configure CORS for the app origin only. Content-type + size validation on presign.

## 9. Safety, consent, and abuse prevention (required, not optional)
- Voice cloning is for the user's **own voice only**. Before saving a voice: explicit consent checkbox, and a **live-read verification** — the user reads the randomly chosen Khmer prompt shown on screen (this is what the mockup's "script to read" is for). Reject uploaded files for cloning unless they pass the same liveness check, or are marked as the user's own with consent recorded. Store the consent record.
- VoxCPM2's license forbids impersonation, fraud, and disinformation — put that in the Terms and the consent text.
- Implement the "AI voice protection" toggle as an inaudible audio watermark on generated audio plus a visible "AI-generated" metadata tag; default on.
- Public "trending voices" are opt-in, by the voice owner, with a revoke button that takes effect immediately.
- Add a report button on public voices and an admin kill switch.
- Don't log raw audio or transcripts in plain application logs.

## 10. Quality bar
- Khmer text must render correctly everywhere (line-height for Khmer script, no clipped subscripts, correct Khmer numerals only where designed). Test with long Khmer strings.
- Mobile first (360–430 px), usable on desktop (centered max-width container or responsive two-column).
- Accessibility: focus states, aria labels on icon buttons, reduced-motion respect, contrast per DESIGN.md.
- Tests: unit tests for credit ledger and consent rules; an e2e smoke test (Playwright) for record → clone → preview → lyrics → song with the mock provider.
- Performance: lazy-load wavesurfer and routes; audio streaming with range requests.

## 11. Phases (stop and show me a summary after each)
1. **Foundation:** repo, design tokens, shell + bottom nav, Supabase auth, DB migrations + RLS, R2 presign, `.env.example`, CI.
2. **UI with mock data:** all 6 screens pixel-matched to the mockups, including loading/empty/error states.
3. **Voice clone:** recorder + frequency meter, consent + liveness, VoxCPM2 worker, preview, A/B comparison with real metrics only.
4. **Lyrics:** Claude via AI Gateway, structured JSON, rhyme/syllable highlighting, save/copy/share.
5. **Songs:** `MusicProvider` + mock adapter, Khmer-quality evaluation of real candidates, stems, song profile page.
6. **Credits, quotas, rate limits, settings, cache purge, watermark.**
7. **Hardening and deploy:** security review, spend caps, logging, backups, deploy docs.

## 12. Ask me before you start
- Hosting choice (Cloudflare Workers vs Railway for the API; where the GPU worker runs and its budget).
- Whether there is a licensed song-generation provider or API key available already.
- Plan/credit rules (free slots, what costs credits, any payments needed now).
- Public voice library: include in v1 or defer?
- App name and branding (keep "Khmer Sonic AI" or rebrand).
