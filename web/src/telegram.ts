/**
 * Thin wrapper over the Telegram Mini App SDK (window.Telegram.WebApp).
 * Works outside Telegram too (plain browser / PWA) by degrading gracefully,
 * so the same build runs during development and as an installed PWA.
 */

type TgWebApp = {
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; language_code?: string } };
  colorScheme?: "light" | "dark";
  themeParams?: Record<string, string>;
  viewportStableHeight?: number;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred?: (s: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred?: (t: "error" | "success" | "warning") => void;
    selectionChanged?: () => void;
  };
  MainButton?: { hide: () => void };
  openLink?: (url: string) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg: TgWebApp | undefined =
  typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

export const isTelegram = Boolean(tg && tg.initData);

/** The signed initData string — sent to the API so it can verify the user. */
export function initData(): string {
  return tg?.initData ?? "";
}

export function tgUser() {
  return tg?.initDataUnsafe?.user;
}

/** Call once on boot: tells Telegram we're ready, expands to full height. */
export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setBackgroundColor?.("#f8f9ff");
    tg.setHeaderColor?.("#f8f9ff");
    if (tg.viewportStableHeight) {
      document.documentElement.style.setProperty("--tg-viewport-height", `${tg.viewportStableHeight}px`);
    }
  } catch {
    /* non-fatal: run as a normal PWA */
  }
}

export function haptic(kind: "light" | "medium" | "heavy" = "light") {
  try {
    tg?.HapticFeedback?.impactOccurred?.(kind);
  } catch {
    /* ignore */
  }
}

export function notify(kind: "error" | "success" | "warning") {
  try {
    tg?.HapticFeedback?.notificationOccurred?.(kind);
  } catch {
    /* ignore */
  }
}
