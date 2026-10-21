import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Download,
  Globe,
  LayoutGrid,
  MoreVertical,
  Plus,
  Share,
  Smartphone,
} from "lucide-react";

import {
  isAndroidDevice,
  isIosDevice,
  type PwaInstallGuideTrack,
} from "@/lib/pwa/install";

export type PwaInstallGuideStep = {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

export type InstallGuidePlatform = "ios" | "android" | "desktop";

export function resolveInstallGuidePlatform(): InstallGuidePlatform {
  if (typeof navigator === "undefined") return "desktop";
  if (isAndroidDevice()) return "android";
  if (isIosDevice()) return "ios";
  return "desktop";
}

/** iPhone/iPad Safari — only way to install on iOS without a store app. */
export const PWA_IOS_SAFARI_STEPS: PwaInstallGuideStep[] = [
  {
    id: "safari-open",
    title: "In Safari öffnen",
    body:
      "Öffne zeloxtag.com in Safari. In Instagram, TikTok oder anderen In-App-Browsern gibt es kein „Zum Home-Bildschirm“.",
    icon: Globe,
  },
  {
    id: "safari-share",
    title: "Teilen",
    body:
      "Tippe auf das Teilen-Symbol (Quadrat mit Pfeil nach oben). Am iPhone unten in der Safari-Leiste, am iPad oft oben rechts.",
    icon: Share,
  },
  {
    id: "safari-add",
    title: "Zum Home-Bildschirm",
    body:
      "Im Teilen-Menü nach unten scrollen und „Zum Home-Bildschirm“ wählen.",
    icon: Plus,
  },
  {
    id: "safari-confirm",
    title: "Hinzufügen",
    body:
      "Oben rechts auf „Hinzufügen“ tippen. ZeloxTag startet danach vom Icon — ohne Safari-Adressleiste.",
    icon: CheckCircle2,
  },
];

/** Chrome on iOS — same WebKit as Safari, no „App installieren“-Dialog. */
export const PWA_IOS_CHROME_STEPS: PwaInstallGuideStep[] = [
  {
    id: "ios-chrome-open",
    title: "In Chrome öffnen",
    body:
      "Nutze Chrome auf dem iPhone oder iPad. In-App-Browser von Social Apps unterstützen das Hinzufügen nicht.",
    icon: Smartphone,
  },
  {
    id: "ios-chrome-menu",
    title: "Chrome-Menü",
    body:
      "Tippe unten rechts auf die drei Punkte (⋯).",
    icon: MoreVertical,
  },
  {
    id: "ios-chrome-add",
    title: "Zum Home-Bildschirm",
    body:
      "Wähle „Teilen“ und dann „Zum Home-Bildschirm“, oder tippe „Zum Home-Bildschirm“, falls Chrome es direkt anbietet.",
    icon: Share,
  },
  {
    id: "ios-chrome-confirm",
    title: "Hinzufügen",
    body:
      "Mit „Hinzufügen“ bestätigen. Das Icon erscheint auf dem Home-Bildschirm.",
    icon: CheckCircle2,
  },
];

/** Chrome on Android — PWA install via menu or system prompt. */
export const PWA_ANDROID_CHROME_STEPS: PwaInstallGuideStep[] = [
  {
    id: "android-chrome-open",
    title: "In Chrome öffnen",
    body: "Öffne zeloxtag.com in Google Chrome — nicht in einem eingebetteten Browser einer anderen App.",
    icon: Globe,
  },
  {
    id: "android-chrome-menu",
    title: "Menü öffnen",
    body: "Tippe oben rechts auf die drei Punkte (⋯).",
    icon: MoreVertical,
  },
  {
    id: "android-chrome-install",
    title: "App installieren",
    body:
      "Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“ (je nach Chrome-Version).",
    icon: LayoutGrid,
  },
  {
    id: "android-chrome-confirm",
    title: "Bestätigen",
    body:
      "Installation bestätigen. ZeloxTag öffnet sich danach im Vollbild vom Startbildschirm.",
    icon: CheckCircle2,
  },
];

/** Desktop Chrome — address-bar install or menu. */
export const PWA_DESKTOP_CHROME_STEPS: PwaInstallGuideStep[] = [
  {
    id: "desktop-chrome-open",
    title: "In Chrome öffnen",
    body: "Öffne zeloxtag.com in Google Chrome auf dem Computer.",
    icon: Globe,
  },
  {
    id: "desktop-chrome-bar",
    title: "Installieren in der Adressleiste",
    body:
      "Wenn Chrome es anbietet: auf „Installieren“ oder das Computer-Symbol rechts in der Adressleiste klicken.",
    icon: Download,
  },
  {
    id: "desktop-chrome-menu",
    title: "Oder über das Menü",
    body:
      "Drei Punkte (⋯) → „ZeloxTag installieren…“ oder „Zum Startbildschirm hinzufügen“.",
    icon: MoreVertical,
  },
];

export const PWA_NATIVE_INSTALL_STEP: PwaInstallGuideStep = {
  id: "chrome-native",
  title: "Direkt installieren",
  body:
    "Tippe unten auf „App installieren“ — Chrome zeigt dann den System-Dialog, ohne das Menü.",
  icon: Download,
};

export function resolveInstallGuideSteps(
  track: PwaInstallGuideTrack,
  platform: InstallGuidePlatform,
  options?: { includeNativeInstall?: boolean },
): PwaInstallGuideStep[] {
  if (track === "safari") {
    return [...PWA_IOS_SAFARI_STEPS];
  }

  let steps: PwaInstallGuideStep[];
  switch (platform) {
    case "android":
      steps = [...PWA_ANDROID_CHROME_STEPS];
      break;
    case "ios":
      steps = [...PWA_IOS_CHROME_STEPS];
      break;
    default:
      steps = [...PWA_DESKTOP_CHROME_STEPS];
      break;
  }

  if (options?.includeNativeInstall && platform !== "ios") {
    steps = [...steps, PWA_NATIVE_INSTALL_STEP];
  }

  return steps;
}

/** @deprecated Use {@link resolveInstallGuideSteps} */
export function stepsForGuideTrack(
  track: PwaInstallGuideTrack,
): PwaInstallGuideStep[] {
  return resolveInstallGuideSteps(track, resolveInstallGuidePlatform());
}

/** @deprecated Use {@link resolveInstallGuideSteps} with includeNativeInstall */
export function filterChromeInstallSteps(
  steps: readonly PwaInstallGuideStep[],
  includeNativeInstallSlide: boolean,
): PwaInstallGuideStep[] {
  if (includeNativeInstallSlide) return [...steps];
  return steps.filter((step) => step.id !== "chrome-native");
}
