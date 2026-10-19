# Deploying Khmer Sonic AI on the VPS, behind the one Telegram bot

This app runs as its own container and is opened from a button in the single
bot in [`saveitkh/project1`](https://github.com/saveitkh/project1) — exactly how
that bot already opens the **Dubbing Studio**. One bot, several Mini Apps; each
button opens a different app.

```
Telegram ──(button: 🎵 បង្កើតបទចម្រៀង)──▶ Mini App (this service)
   │                                         https://song.<vps-ip>.sslip.io
   └── bot (project1)  ◀── other buttons open other Mini Apps
```

Telegram only opens **https** Mini Apps. The free `sslip.io` names resolve any
`something.<VPS-IP>.sslip.io` to that IP, so **no domain purchase is needed** —
the same trick the bot repo already uses for the dubbing studio.

## 1. One-time: register the Mini App URL with @BotFather

The bot button opens the URL in `SONG_STUDIO_URL`. For Telegram to treat it as a
Mini App (and send signed `initData`), the URL must be registered:

- `@BotFather` → your bot → **Bot Settings → Menu Button / Mini Apps** → add the
  URL `https://song.<VPS-IP>.sslip.io/`.

## 2. Add the service to the VPS compose (in project1)

The `project1` repo's `docker-compose.yml` already defines `studio`, `bot`, and
`caddy`. This branch adds a `song` service built straight from **this** repo and
a Caddy host for it. You only need to set two env values and bring it up:

```bash
# in the project1 checkout, on branch claude/khmer-song-ui-production-9z3b8b
cp .env.vps.example .env        # if not already; fill STUDIO_HOST etc.

# Add the song Mini App host + its git ref:
echo 'SONG_HOST=song.184-174-38-113.sslip.io'  >> .env   # use YOUR vps IP
echo 'SONG_GIT_REF=claude/khmer-song-ui-production-9z3b8b' >> .env

docker compose up -d --build song caddy
```

Caddy gets a Let's Encrypt cert for `SONG_HOST` automatically. Confirm:

```bash
curl https://song.<VPS-IP>.sslip.io/api/health
# {"ok":true,"engines":{...,"mode":"telegram-auth"}}
```

`mode: telegram-auth` means `TELEGRAM_BOT_TOKEN` is set and real auth is on.
`dev-no-auth` means the token is missing — fix before sharing the link.

## 3. Point the bot at it

Set, wherever the bot runs (VPS `.env` or Railway variables):

```
SONG_STUDIO_URL=https://song.<VPS-IP>.sslip.io/
```

Restart the bot. The persistent keyboard now shows **🎵 បង្កើតបទចម្រៀង**, and
`/song` works too. Tapping it opens this Mini App inside Telegram with signed
`initData`, which this service verifies with the **same** bot token.

## 4. Turn engines on (after the Khmer evaluation)

Everything above works on the mock engine. To enable real generation, set the
keys in the `song` service's environment and flip the provider vars:

```
TELEGRAM_BOT_TOKEN=<same as the bot's TELEGRAM_LOGIN_BOT_TOKEN>
LYRICS_PROVIDER=claude      ANTHROPIC_API_KEY=...
MUSIC_PROVIDER=gemini-lyria GEMINI_API_KEY=...     # only after §6 eval passes
VOICE_PROVIDER=voxcpm2      VOXCPM_WORKER_URL=...  VOXCPM_WORKER_SECRET=...
SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=...
```

Then `docker compose up -d --build song`.

**Before enabling Lyria as the song engine**, run the Khmer listening test
(3 lyric sets × 3 genres) described in `design/BUILD_PROMPT.md` §6 and confirm
pronunciation is usable. Until then the Gemini-Lyria adapter refuses on purpose
rather than shipping unverified Khmer vocals. The GPU worker (VoxCPM2) must
never be exposed publicly — only this API calls it over HTTPS with the shared
secret.

## Notes

- The container serves the built PWA and the API from one Node process on
  `:3000`; Caddy terminates TLS and proxies to it.
- `docker-compose` healthcheck / Caddy both rely on `GET /api/health`.
- Rebuild on new commits: `docker compose up -d --build song` (set
  `SONG_GIT_REF` to the branch/tag you want).
