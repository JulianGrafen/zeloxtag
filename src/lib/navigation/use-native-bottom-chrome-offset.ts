"use client";

import { useSyncExternalStore } from "react";

import { usePlatformServices } from "@/services/platform/context/platform-services-context";

function subscribeNativePreviewNoop() {
  return () => undefined;
}

function getNativePreviewSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV !== "development") return false;
  return new URLSearchParams(window.location.search).get("native") === "1";
}

/** Lifts fixed bottom chrome above the native tab bar (matches AdaptiveNavShell padding). */
export function useNativeBottomChromeOffsetClass(): string {
  const { platform } = usePlatformServices();
  const devNativePreview = useSyncExternalStore(
    subscribeNativePreviewNoop,
    getNativePreviewSnapshot,
    () => false,
  );
  const isNative = platform.isNativePlatform || devNativePreview;
  return isNative
    ? "bottom-[calc(4rem+env(safe-area-inset-bottom))]"
    : "bottom-0";
}
