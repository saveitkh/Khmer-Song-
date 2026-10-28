import crypto from "node:crypto";
import { config } from "./config.js";

/**
 * Verify a Telegram Mini App initData string.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 *   secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)
 *   hash       = HMAC_SHA256(key=secret_key, msg=data_check_string)
 *
 * Returns the parsed user object on success, or null on failure.
 */
export function verifyInitData(initData, { botToken, maxAgeS }) {
  if (!initData || !botToken) return null;
  let params;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }
  const hash = params.get("hash");
  if (!hash) return null;

  const pairs = [];
  for (const [k, v] of params) {
    if (k === "hash") continue;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // Constant-time compare.
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  // Replay protection.
  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  if (maxAgeS && authDate) {
    const ageS = Math.floor(Date.now() / 1000) - authDate;
    if (ageS > maxAgeS) return null;
  }

  try {
    const userRaw = params.get("user");
    return userRaw ? JSON.parse(userRaw) : null;
  } catch {
    return null;
  }
}

const DEV_USER = {
  id: 1000001,
  first_name: "Demo",
  username: "demo",
  language_code: "km",
};

/** Express middleware: sets req.tgUser from the signed header, or 401s.
 * In dev mode (no bot token) a fixed demo user is injected. */
export function authMiddleware(req, res, next) {
  if (config.devMode) {
    req.tgUser = DEV_USER;
    return next();
  }
  const initData = req.get("X-Telegram-Init-Data") || "";
  const user = verifyInitData(initData, {
    botToken: config.botToken,
    maxAgeS: config.initDataMaxAgeS,
  });
  if (user?.id) {
    req.tgUser = user;
    return next();
  }
  // Browser-preview mode: no valid Telegram auth, but ALLOW_BROWSER_DEMO lets
  // anyone open the URL in a plain browser and explore the app as a shared demo
  // user (mock data). Keep it OFF in real production.
  if (config.allowBrowserDemo) {
    req.tgUser = { ...DEV_USER };
    return next();
  }
  return res.status(401).json({ code: "unauthorized", message: "ការផ្ទៀងផ្ទាត់បរាជ័យ — សូមបើកកម្មវិធីពី Telegram" });
}
