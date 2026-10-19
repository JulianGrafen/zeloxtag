"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";

import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "zelox-embedded-browser-banner-dismissed";

function readDismissed(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

export function EmbeddedSocialBrowserBanner() {
  const { platform } = usePlatformServices();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!platform.isEmbeddedSocialWebView || readDismissed()) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [platform.isEmbeddedSocialWebView]);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const openInSystemBrowser = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const target = window.location.href || PRODUCTION_SITE_URL;
    window.open(target, "_blank", "noopener,noreferrer");
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-[60] border-b border-amber-500/25 bg-amber-950/95 px-3 py-2.5 text-amber-50 backdrop-blur-sm",
      )}
      role="region"
      aria-label="Browser-Hinweis"
    >
      <div className="mx-auto flex max-w-lg items-start gap-2">
        <p className="flex-1 text-[0.78rem] leading-snug">
          Du bist im In-App-Browser von Instagram oder TikTok. Für Teilen und
          volle Funktionen:{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={openInSystemBrowser}
          >
            In Safari oder Chrome öffnen
          </button>{" "}
          — oder die ZeloxTag-App installieren.
        </p>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 text-amber-100/90"
          aria-label="Hinweis schließen"
          onClick={dismiss}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        className="mx-auto mt-2 flex min-h-9 w-full max-w-lg items-center justify-center gap-2 rounded-lg bg-amber-500/20 text-[0.8rem] font-semibold text-amber-50"
        onClick={openInSystemBrowser}
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
        Jetzt im Standard-Browser öffnen
      </button>
    </div>
  );
}
