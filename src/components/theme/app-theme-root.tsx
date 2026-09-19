"use client";

import type { ReactNode } from "react";

import { PwaRoot } from "@/components/pwa/pwa-root";
import { Toaster } from "@/components/ui/sonner";

import { PwaThemeColorSync } from "./pwa-theme-color-sync";
import { ThemeProvider } from "./theme-provider";

/** Client shell: theme class on html + PWA + toasts. */
export function AppThemeRoot({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PwaThemeColorSync />
      {children}
      <PwaRoot />
      <Toaster richColors closeButton position="top-center" />
    </ThemeProvider>
  );
}
