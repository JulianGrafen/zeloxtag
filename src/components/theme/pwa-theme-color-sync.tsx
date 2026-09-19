"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import {
  PWA_THEME_COLOR,
  PWA_THEME_COLOR_LIGHT,
} from "@/lib/pwa/constants";

/** Keeps mobile browser chrome in sync with resolved light/dark theme. */
export function PwaThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color =
      resolvedTheme === "dark" ? PWA_THEME_COLOR : PWA_THEME_COLOR_LIGHT;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  }, [resolvedTheme]);

  return null;
}
