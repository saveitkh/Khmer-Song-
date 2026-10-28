import "dotenv/config";

const str = (k, d = "") => process.env[k] ?? d;
const int = (k, d) => {
  const v = parseInt(process.env[k] ?? "", 10);
  return Number.isFinite(v) ? v : d;
};
const onOff = (k, d = false) => {
  const v = (process.env[k] ?? "").toLowerCase();
  if (v === "on" || v === "true" || v === "1") return true;
  if (v === "off" || v === "false" || v === "0") return false;
  return d;
};

export const config = {
  port: int("PORT", 3000),
  publicUrl: str("PUBLIC_URL"),

  // Auth
  botToken: str("TELEGRAM_BOT_TOKEN"),
  initDataMaxAgeS: int("TELEGRAM_INITDATA_MAX_AGE_S", 86400),
  // When on, requests without valid Telegram initData are served as a shared
  // demo user (mock data) so the app can be opened in a plain browser. OFF for
  // real production.
  allowBrowserDemo: onOff("ALLOW_BROWSER_DEMO", false),
  get devMode() {
    // No bot token → dev mode (fake user, no signature check). Never in prod.
    return !this.botToken;
  },

  // Engine selection
  voiceProvider: str("VOICE_PROVIDER", "mock"),
  lyricsProvider: str("LYRICS_PROVIDER", "mock"),
  musicProvider: str("MUSIC_PROVIDER", "mock"),

  // Provider keys
  anthropicKey: str("ANTHROPIC_API_KEY"),
  claudeModel: str("CLAUDE_MODEL", "claude-sonnet-5-5"),
  geminiKey: str("GEMINI_API_KEY"),
  geminiLyriaModel: str("GEMINI_LYRIA_MODEL", "lyria-3.5"),
  geminiTtsModel: str("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts"),
  voxcpmUrl: str("VOXCPM_WORKER_URL"),
  voxcpmSecret: str("VOXCPM_WORKER_SECRET"),

  // Supabase / R2 (optional in mock mode)
  supabaseUrl: str("SUPABASE_URL"),
  supabaseServiceKey: str("SUPABASE_SERVICE_ROLE_KEY"),
  r2: {
    accountId: str("R2_ACCOUNT_ID"),
    accessKeyId: str("R2_ACCESS_KEY_ID"),
    secretAccessKey: str("R2_SECRET_ACCESS_KEY"),
    bucketVoiceRefs: str("R2_BUCKET_VOICE_REFS", "ks-voice-refs"),
    bucketOutputs: str("R2_BUCKET_OUTPUTS", "ks-outputs"),
    publicBase: str("R2_PUBLIC_BASE"),
    get configured() {
      return Boolean(this.accountId && this.accessKeyId && this.secretAccessKey);
    },
  },

  // Safety / limits
  rateLimitPerUserPerDay: int("RATE_LIMIT_PER_USER_PER_DAY", 50),
  dailySpendCapUsd: int("DAILY_SPEND_CAP_USD", 25),
  killswitch: {
    voice: onOff("KILLSWITCH_VOICE", false),
    lyrics: onOff("KILLSWITCH_LYRICS", false),
    music: onOff("KILLSWITCH_MUSIC", false),
  },
  watermark: onOff("AUDIO_WATERMARK", true),
};

export function enginesSummary() {
  return {
    voice: config.voiceProvider,
    lyrics: config.lyricsProvider,
    music: config.musicProvider,
    mode: config.devMode ? "dev-no-auth" : config.allowBrowserDemo ? "telegram-auth+browser-demo" : "telegram-auth",
    storage: config.r2.configured ? "r2" : "mock",
  };
}
