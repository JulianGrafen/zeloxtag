"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { PwaInstallStepCarousel } from "@/components/pwa/pwa-install-step-carousel";
import { Button } from "@/components/ui/button";
import {
  resolveInstallGuidePlatform,
  resolveInstallGuideSteps,
  type InstallGuidePlatform,
} from "@/lib/pwa/install-guide-steps";
import type { PwaInstallGuideTrack } from "@/lib/pwa/install";
import { cn } from "@/lib/utils";

type PwaInstallGuideProps = {
  /** Auto-detect single track, or both with tabs. */
  variant?: "auto" | "full" | PwaInstallGuideTrack;
  showChromeInstallButton?: boolean;
  onChromeInstall?: () => void;
  compact?: boolean;
  className?: string;
};

function BrowserTabs({
  active,
  onChange,
}: {
  active: PwaInstallGuideTrack;
  onChange: (track: PwaInstallGuideTrack) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Browser-Anleitung"
      className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-1"
    >
      {(
        [
          { id: "safari" as const, label: "Safari" },
          { id: "chrome" as const, label: "Chrome" },
        ] as const
      ).map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-[0.82rem] font-semibold transition-colors",
              selected
                ? "bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-sm"
                : "text-[color:var(--vd-muted)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function PwaInstallGuide({
  variant = "full",
  showChromeInstallButton = false,
  onChromeInstall,
  compact = false,
  className,
}: PwaInstallGuideProps) {
  const [tabTrack, setTabTrack] = useState<PwaInstallGuideTrack>("safari");
  const platform: InstallGuidePlatform = useMemo(
    () => resolveInstallGuidePlatform(),
    [],
  );

  const track: PwaInstallGuideTrack | "both" =
    variant === "auto"
      ? "both"
      : variant === "full"
        ? "both"
        : variant;

  const steps = useMemo(() => {
    const activeTrack = track === "both" ? tabTrack : track;
    return resolveInstallGuideSteps(activeTrack, platform, {
      includeNativeInstall:
        showChromeInstallButton && activeTrack === "chrome",
    });
  }, [platform, showChromeInstallButton, tabTrack, track]);

  return (
    <div className={className}>
      {track === "both" ? (
        <BrowserTabs active={tabTrack} onChange={setTabTrack} />
      ) : null}

      <PwaInstallStepCarousel
        steps={steps}
        slideMinHeightClassName={compact ? "min-h-[12.5rem]" : "min-h-[14rem]"}
      />

      {showChromeInstallButton &&
      onChromeInstall &&
      track !== "safari" &&
      (track === "chrome" || tabTrack === "chrome") ? (
        <Button
          type="button"
          className={cn(
            "mt-4 w-full font-semibold",
            compact ? "h-10 text-[0.88rem]" : "h-11",
          )}
          onClick={() => void onChromeInstall()}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden />
          App installieren
        </Button>
      ) : null}
    </div>
  );
}
