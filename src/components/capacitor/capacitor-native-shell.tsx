"use client";

import { useCapacitorDeepLink } from "@/hooks/useCapacitorDeepLink";
import { useCapacitorNativeShell } from "@/hooks/useCapacitorNativeShell";

/** Native-only: deep links, status bar, splash hide. No-op on web. */
export function CapacitorNativeShell() {
  useCapacitorDeepLink();
  useCapacitorNativeShell();
  return null;
}
