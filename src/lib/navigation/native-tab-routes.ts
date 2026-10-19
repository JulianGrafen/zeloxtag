import type { LucideIcon } from "lucide-react";
import { Car, Compass, ScanLine, Settings } from "lucide-react";

export type NativeTabId = "garage" | "swipe" | "scan" | "settings";

export type NativeTabDefinition = {
  id: NativeTabId;
  label: string;
  icon: LucideIcon;
  /** Static href or resolved client-side for garage/scan. */
  href: string | "dynamic:garage" | "dynamic:scan";
  matchPrefixes: string[];
};

export const NATIVE_TAB_DEFINITIONS: readonly NativeTabDefinition[] = [
  {
    id: "garage",
    label: "Garage",
    icon: Car,
    href: "dynamic:garage",
    matchPrefixes: ["/dashboard", "/garage/", "/v/"],
  },
  {
    id: "swipe",
    label: "Swipe",
    icon: Compass,
    href: "/swipe",
    matchPrefixes: ["/swipe"],
  },
  {
    id: "scan",
    label: "Scan",
    icon: ScanLine,
    href: "dynamic:scan",
    matchPrefixes: [],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/settings",
    matchPrefixes: ["/settings"],
  },
] as const;

export function resolveNativeTabHref(
  tab: NativeTabDefinition,
  garageHref: string,
  scanHref: string,
): string {
  if (tab.href === "dynamic:garage") {
    return garageHref;
  }
  if (tab.href === "dynamic:scan") {
    return scanHref;
  }
  return tab.href;
}

export function isNativeTabActive(
  pathname: string,
  tab: NativeTabDefinition,
): boolean {
  if (tab.id === "scan") {
    return pathname.includes("scan=1");
  }
  return tab.matchPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}
