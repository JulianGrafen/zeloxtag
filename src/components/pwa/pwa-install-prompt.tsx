"use client";

import { Plus, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/lib/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

function IosShareHint() {
  return (
    <p className="mt-2 text-[0.8rem] leading-relaxed text-[color:var(--vd-muted)]">
      Tippe unten auf das Teilen-Icon{" "}
      <Share
        className="mx-0.5 inline h-4 w-4 align-[-0.2em] text-[color:var(--vd-text)]"
        aria-hidden
      />{" "}
      und wähle{" "}
      <span className="inline-flex items-center gap-0.5 font-medium text-[color:var(--vd-text)]">
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Zum Home-Bildschirm
      </span>
      .
    </p>
  );
}

export function PwaInstallPrompt() {
  const { visible, platform, canNativeInstall, dismiss, promptInstall } =
    usePwaInstall();

  if (!visible) return null;

  const isIos = platform === "ios";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[90] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
    >
      <div
        className={cn(
          "mx-auto flex max-w-lg gap-3 rounded-2xl border border-[color:var(--vd-border)]",
          "bg-[color:var(--vd-surface)]/92 p-4 shadow-[var(--vd-shadow-modal)] backdrop-blur-xl",
        )}
      >
        <div className="min-w-0 flex-1">
          <p
            id="pwa-install-title"
            className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]"
          >
            ZeloxTag als App installieren
          </p>
          <div id="pwa-install-desc">
            {isIos ? (
              <IosShareHint />
            ) : (
              <p className="mt-2 text-[0.8rem] leading-relaxed text-[color:var(--vd-muted)]">
                Installiere ZeloxTag auf deinem Home-Bildschirm — schneller Zugriff,
                ohne Browser-Leiste.
              </p>
            )}
          </div>
          {!isIos && canNativeInstall ? (
            <Button
              type="button"
              className="mt-3 h-10 w-full text-[0.88rem] font-semibold"
              onClick={() => void promptInstall()}
            >
              App installieren
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Installationshinweis schließen"
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]",
            "text-[color:var(--vd-muted)] transition hover:text-[color:var(--vd-text)]",
          )}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
