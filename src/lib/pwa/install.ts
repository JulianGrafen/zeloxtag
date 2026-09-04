export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const PWA_INSTALL_DISMISS_KEY = "zlx-pwa-install-dismissed";

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

export function readInstallDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistInstallDismissed(): void {
  try {
    window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
  } catch {
    /* private mode / quota */
  }
}

export function isBeforeInstallPromptEvent(
  event: Event,
): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof (event as BeforeInstallPromptEvent).prompt === "function";
}
