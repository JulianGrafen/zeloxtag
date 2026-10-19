"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

const TAG_PATH_RE = /^\/v\/([0-9a-f-]{36})/i;
const GARAGE_PATH_RE = /^\/garage\/([0-9a-f-]{36})/i;

const LAST_GARAGE_KEY = "zelox-native-last-garage-href";

function readStoredGarageHref(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const value = sessionStorage.getItem(LAST_GARAGE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function rememberNativeGarageHref(href: string): void {
  if (typeof sessionStorage === "undefined" || !href.startsWith("/")) {
    return;
  }
  try {
    sessionStorage.setItem(LAST_GARAGE_KEY, href);
  } catch {
    /* ignore */
  }
}

export function useNativeGarageHref(fallback = "/dashboard"): string {
  const pathname = usePathname() ?? "";

  return useMemo(() => {
    const tagMatch = pathname.match(TAG_PATH_RE);
    if (tagMatch?.[1]) {
      return `/v/${tagMatch[1]}`;
    }
    const garageMatch = pathname.match(GARAGE_PATH_RE);
    if (garageMatch?.[1]) {
      return `/garage/${garageMatch[1]}`;
    }
    return readStoredGarageHref() ?? fallback;
  }, [fallback, pathname]);
}

export function useNativeScanHref(fallbackGarage = "/dashboard"): string {
  const garageHref = useNativeGarageHref(fallbackGarage);
  const separator = garageHref.includes("?") ? "&" : "?";
  return `${garageHref}${separator}scan=1`;
}
