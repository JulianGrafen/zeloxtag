"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";

import { CapacitorNativeShell } from "@/components/capacitor/capacitor-native-shell";
import { EmbeddedSocialBrowserBanner } from "@/components/platform/embedded-social-browser-banner";
import { PlatformServicesProvider } from "@/services/platform/context/platform-services-context";
import { PwaRoot } from "@/components/pwa/pwa-root";
import { ShowcaseSwipeDailyStatsToastListener } from "@/components/showcase-swipe/showcase-swipe-daily-stats-toast-listener";
import { ShowcaseWeeklyRankAwardToastListener } from "@/components/showcase-swipe/showcase-weekly-rank-award-toast-listener";
import { SavedToastListener } from "@/components/ui/saved-toast-listener";
import { Toaster } from "@/components/ui/sonner";

import { PwaThemeColorSync } from "./pwa-theme-color-sync";
import { ThemeProvider } from "./theme-provider";

/** Client shell: theme class on html + PWA + toasts. */
export function AppThemeRoot({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PlatformServicesProvider>
        <CapacitorNativeShell />
        <EmbeddedSocialBrowserBanner />
        <PwaThemeColorSync />
        {children}
        <PwaRoot />
        <Suspense fallback={null}>
          <SavedToastListener />
          <ShowcaseSwipeDailyStatsToastListener />
          <ShowcaseWeeklyRankAwardToastListener />
        </Suspense>
        <Toaster richColors closeButton position="top-center" />
      </PlatformServicesProvider>
    </ThemeProvider>
  );
}
