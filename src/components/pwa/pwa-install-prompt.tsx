"use client";

import { X } from "lucide-react";

import { PwaInstallGuide } from "@/components/pwa/pwa-install-guide";
import { usePwaInstall } from "@/lib/hooks/use-pwa-install";
import { isIosChrome, isIosSafari } from "@/lib/pwa/install";
import { cn } from "@/lib/utils";

export function PwaInstallPrompt() {
  const { visible, platform, canNativeInstall, dismiss, promptInstall } =
    usePwaInstall();

  if (!visible) return null;

  const guideVariant =
    platform === "ios"
      ? isIosSafari()
        ? "safari"
        : isIosChrome()
          ? "chrome"
          : "full"
      : "chrome";

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
          <div id="pwa-install-desc" className="mt-2">
            <PwaInstallGuide
              compact
              variant={guideVariant}
              showChromeInstallButton={canNativeInstall}
              onChromeInstall={promptInstall}
            />
          </div>
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
