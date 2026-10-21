import { isNativeCapacitor } from "@/lib/capacitor/platform";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** @deprecated Legacy permanent dismiss — migrated away on read; do not write. */
export const PWA_INSTALL_DISMISS_KEY = "zlx-pwa-install-dismissed";

export const PWA_INSTALL_INSTALLED_KEY = "zlx-pwa-installed";
export const PWA_INSTALL_SNOOZE_UNTIL_KEY = "zlx-pwa-install-snooze-until";

export const PWA_INSTALL_SNOOZE_DAYS = 7;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const isAppleMobile =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return isAppleMobile;
}

/** Safari on iOS — no native beforeinstallprompt. */
export function isIosSafari(): boolean {
  if (!isIosDevice()) return false;

  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
}

/** Chrome on iOS — shares WebKit, manual add-to-home-screen flow. */
export function isIosChrome(): boolean {
  if (!isIosDevice()) return false;
  return /CriOS/i.test(navigator.userAgent);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return isIosDevice() || isAndroidDevice();
}

/** Remove legacy “dismiss forever” flag so users who never installed can see the prompt again. */
export function migrateLegacyInstallDismiss(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "1") {
      window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
    }
  } catch {
    /* private mode */
  }
}

export function readPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  migrateLegacyInstallDismiss();
  try {
    return window.localStorage.getItem(PWA_INSTALL_INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistPwaInstalled(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PWA_INSTALL_INSTALLED_KEY, "1");
    window.localStorage.removeItem(PWA_INSTALL_SNOOZE_UNTIL_KEY);
  } catch {
    /* private mode */
  }
}

export function readPwaSnoozed(): boolean {
  if (typeof window === "undefined") return false;
  migrateLegacyInstallDismiss();
  try {
    const raw = window.localStorage.getItem(PWA_INSTALL_SNOOZE_UNTIL_KEY);
    if (!raw) return false;
    const until = Date.parse(raw);
    if (!Number.isFinite(until)) {
      window.localStorage.removeItem(PWA_INSTALL_SNOOZE_UNTIL_KEY);
      return false;
    }
    if (Date.now() < until) {
      return true;
    }
    window.localStorage.removeItem(PWA_INSTALL_SNOOZE_UNTIL_KEY);
    return false;
  } catch {
    return false;
  }
}

export function persistPwaSnooze(
  days: number = PWA_INSTALL_SNOOZE_DAYS,
): void {
  if (typeof window === "undefined") return;
  try {
    const until = new Date();
    until.setDate(until.getDate() + days);
    window.localStorage.setItem(
      PWA_INSTALL_SNOOZE_UNTIL_KEY,
      until.toISOString(),
    );
  } catch {
    /* private mode */
  }
}

export function clearPwaSnooze(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PWA_INSTALL_SNOOZE_UNTIL_KEY);
  } catch {
    /* private mode */
  }
}

export function isPwaInstalled(): boolean {
  return isStandaloneDisplay() || readPwaInstalled();
}

export function shouldOfferPwaInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeCapacitor()) return false;
  if (isPwaInstalled()) return false;
  if (readPwaSnoozed()) return false;
  return true;
}

/** @deprecated Use readPwaSnoozed / shouldOfferPwaInstallPrompt */
export function readInstallDismissed(): boolean {
  return readPwaSnoozed();
}

/** @deprecated Use persistPwaSnooze */
export function persistInstallDismissed(): void {
  persistPwaSnooze();
}

export function isBeforeInstallPromptEvent(
  event: Event,
): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof (event as BeforeInstallPromptEvent).prompt === "function";
}

export type PwaInstallGuideTrack = "safari" | "chrome";

/** Preferred carousel track for the current mobile browser. */
export function resolvePwaInstallGuideTrack(): PwaInstallGuideTrack | "chooser" {
  if (isIosSafari()) return "safari";
  if (isIosChrome() || isAndroidDevice()) return "chrome";
  if (isIosDevice()) return "safari";
  return "chooser";
}
