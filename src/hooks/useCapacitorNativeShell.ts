"use client";

import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";

import { isNativeCapacitor } from "@/lib/capacitor/platform";
import { PWA_THEME_COLOR } from "@/lib/pwa/constants";

export function useCapacitorNativeShell(): void {
  useEffect(() => {
    if (!isNativeCapacitor()) return;

    const apply = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: PWA_THEME_COLOR });
      } catch {
        // Status bar plugin unavailable on some WebView builds.
      }

      try {
        await SplashScreen.hide();
      } catch {
        // ignore
      }
    };

    void apply();
  }, []);
}
