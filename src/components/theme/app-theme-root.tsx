"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";

import { CapacitorNativeShell } from "@/components/capacitor/capacitor-native-shell";
import { PwaRoot } from "@/components/pwa/pwa-root";
import { SavedToastListener } from "@/components/ui/saved-toast-listener";
import { Toaster } from "@/components/ui/sonner";

import { PwaThemeColorSync } from "./pwa-theme-color-sync";
import { ThemeProvider } from "./theme-provider";

/** Client shell: theme class on html + PWA + toasts. */
export function AppThemeRoot({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <CapacitorNativeShell />
      <PwaThemeColorSync />
      {children}
      <PwaRoot />
      <Suspense fallback={null}>
        <SavedToastListener />
      </Suspense>
      <Toaster richColors closeButton position="top-center" />
    </ThemeProvider>
  );
}
