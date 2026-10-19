import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authMiddleware } from "./telegramAuth.js";
import { api, health } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Built PWA lives at <repo>/web/dist (server/src -> ../../web/dist).
const WEB_DIST = path.resolve(__dirname, "../../web/dist");

/** Build the Express app (no listen) so tests can import it. */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.use(
    cors({
      origin: config.publicUrl ? [config.publicUrl] : true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "X-Telegram-Init-Data"],
    }),
  );

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Telegram embeds the Mini App in an iframe; allow it, deny everyone else.
    res.setHeader("Content-Security-Policy", "frame-ancestors https://web.telegram.org https://*.telegram.org 'self';");
    next();
  });

  // Health is public; everything else under /api requires Telegram auth.
  app.use("/api", health);
  app.use("/api", authMiddleware, api);

  // Serve the built PWA + SPA fallback (hash router → only "/" needs index.html).
  if (fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST, { index: false, maxAge: "1h" }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(WEB_DIST, "index.html"));
    });
  } else {
    app.get("/", (_req, res) =>
      res.status(200).send("Khmer Sonic AI API is running. Build the web app (npm run build) to serve the PWA."),
    );
  }

  app.use("/api", (_req, res) => res.status(404).json({ code: "not_found", message: "route not found" }));
  return app;
}
