import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Download,
  Globe,
  Home,
  MoreVertical,
  Plus,
  Share,
  Smartphone,
} from "lucide-react";

import type { PwaInstallGuideTrack } from "@/lib/pwa/install";

export type PwaInstallGuideStep = {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

export const PWA_SAFARI_INSTALL_STEPS: PwaInstallGuideStep[] = [
  {
    id: "safari-open",
    title: "In Safari öffnen",
    body: "Öffne zeloxtag.com in Safari — andere In-App-Browser (Instagram, Facebook) unterstützen kein „Zum Home-Bildschirm“.",
    icon: Globe,
  },
  {
    id: "safari-share",
    title: "Teilen-Menü",
    body: "Tippe unten in der Leiste auf das Teilen-Symbol. Es öffnet sich das iOS-Share-Sheet.",
    icon: Share,
  },
  {
    id: "safari-add",
    title: "Zum Home-Bildschirm",
    body: "Scrolle im Sheet nach unten und wähle „Zum Home-Bildschirm“. Das ZeloxTag-Icon erscheint auf deinem Startbildschirm.",
    icon: Plus,
  },
  {
    id: "safari-confirm",
    title: "Hinzufügen bestätigen",
    body: "Tippe oben rechts auf „Hinzufügen“. ZeloxTag startet danach ohne Browser-Leiste — wie eine native App.",
    icon: CheckCircle2,
  },
];

export const PWA_CHROME_INSTALL_STEPS: PwaInstallGuideStep[] = [
  {
    id: "chrome-open",
    title: "In Chrome öffnen",
    body: "Nutze Google Chrome auf Android oder iPhone. So findest du die Install-Option zuverlässig.",
    icon: Smartphone,
  },
  {
    id: "chrome-android-menu",
    title: "Android: App installieren",
    body: "Tippe oben rechts auf das Drei-Punkte-Menü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.",
    icon: MoreVertical,
  },
  {
    id: "chrome-android-confirm",
    title: "Android: Bestätigen",
    body: "Bestätige die Installation. Das Icon landet auf dem Startbildschirm und öffnet ZeloxTag im Vollbild.",
    icon: Home,
  },
  {
    id: "chrome-ios-share",
    title: "iPhone: Über Teilen",
    body: "In Chrome auf dem iPhone: Menü → „Teilen…“ → „Zum Home-Bildschirm“ — wie in Safari, nur über Chrome erreichbar.",
    icon: Share,
  },
  {
    id: "chrome-native",
    title: "Direkt installieren",
    body: "Wenn dein Gerät es anbietet, kannst du ZeloxTag auch über den Button „App installieren“ ohne Menü hinzufügen.",
    icon: Download,
  },
];

export function stepsForGuideTrack(
  track: PwaInstallGuideTrack,
): PwaInstallGuideStep[] {
  return track === "safari"
    ? PWA_SAFARI_INSTALL_STEPS
    : PWA_CHROME_INSTALL_STEPS;
}

export function filterChromeInstallSteps(
  steps: readonly PwaInstallGuideStep[],
  includeNativeInstallSlide: boolean,
): PwaInstallGuideStep[] {
  if (includeNativeInstallSlide) return [...steps];
  return steps.filter((step) => step.id !== "chrome-native");
}
