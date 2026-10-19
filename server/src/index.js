import { config, enginesSummary } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[khmer-sonic] listening on :${config.port}`);
  console.log(`[khmer-sonic] engines:`, enginesSummary());
  if (config.devMode) console.log("[khmer-sonic] DEV MODE — Telegram auth disabled (set TELEGRAM_BOT_TOKEN to enable).");
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
