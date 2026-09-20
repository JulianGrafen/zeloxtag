"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { useTheme } from "next-themes";

import GlassSurface from "@/components/GlassSurface";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  isPaywallOpen,
  subscribePaywallOpen,
} from "@/lib/billing/paywall-open-state";
import {
  getDashboardPromptSnapshot,
  subscribeDashboardPrompts,
} from "@/lib/ui/dashboard-prompt-orchestrator";
import { cn } from "@/lib/utils";

function useScanGlassTheme() {
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => {
    setThemeReady(true);
  }, []);
  const isDark = themeReady && resolvedTheme === "dark";

  return {
    isDark,
    surfaceProps: {
      simBackground: "fab-gradient" as const,
      backgroundOpacity: isDark ? 0.14 : 0.22,
      brightness: isDark ? 70 : 52,
      opacity: isDark ? 0.9 : 0.93,
      blur: 15,
      displace: 0.5,
      distortionScale: -180,
      redOffset: 0,
      greenOffset: 10,
      blueOffset: 20,
      mixBlendMode: (isDark ? "normal" : "screen") as "normal" | "screen",
      saturation: isDark ? 1.45 : 1.9,
    },
  };
}

const scanGlassClassName =
  "scan-glass-cta shadow-[var(--scan-glass-cta-shadow)] [&_.glass-surface__content]:p-0";

/** Compact header pill — same glass treatment as the dashboard scan CTA. */
export function ScanGlassPillLink({
  href,
  label = "Scannen",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const { surfaceProps } = useScanGlassTheme();

  return (
    <GlassSurface
      width="auto"
      height="auto"
      borderRadius={9999}
      {...surfaceProps}
      className={cn(scanGlassClassName, "inline-flex shrink-0", className)}
    >
      <PressableLink
        href={href}
        variant="button"
        nav="forward"
        className="inline-flex items-center gap-1.5 rounded-full bg-transparent px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-none"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {label}
      </PressableLink>
    </GlassSurface>
  );
}

export interface DashboardScanCtaProps {
  tagUuid: string;
  /** Prefer in-page scanner when provided. */
  onOpenScanner?: () => void;
  /** Direct link to scan flow (sub-pages without in-page picker). */
  scanHref?: string;
  /** Link to the manual entry page (no receipt / KI scan). */
  manualEntryHref?: string;
  scanLabel?: string;
  /** Free KI scan used — muted CTA that routes to paywall on tap. */
  scanLocked?: boolean;
  onScanLocked?: () => void;
  /** Hide while a photo sheet / modal needs the bottom of the screen. */
  hidden?: boolean;
}

export function DashboardScanCta({
  tagUuid,
  onOpenScanner,
  scanHref,
  manualEntryHref,
  scanLabel = "Dokument scannen",
  scanLocked = false,
  onScanLocked,
}: Omit<DashboardScanCtaProps, "hidden">) {
  const href = scanHref ?? `/v/${tagUuid}?scan=1`;
  const buttonClassName = cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 px-[1.15rem] text-[0.92rem] font-semibold shadow-[var(--claim-cta-shadow)]",
    scanLocked
      ? "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-muted)]"
      : "bg-[color:var(--claim-cta-bg)] text-[color:var(--claim-cta-fg)]",
  );

  function handleScanClick() {
    if (scanLocked) {
      if (onScanLocked) {
        onScanLocked();
        return;
      }
      if (onOpenScanner) {
        onOpenScanner();
        return;
      }
      window.location.assign(href);
      return;
    }
    onOpenScanner?.();
  }

  const useScanButton = Boolean(onOpenScanner) || scanLocked;

  const scanControl = useScanButton ? (
    <PressableButton
      type="button"
      variant="button"
      onClick={handleScanClick}
      className={buttonClassName}
      aria-label={
        scanLocked ? `${scanLabel} — ZeloxTag Pro erforderlich` : scanLabel
      }
    >
      <Plus className="h-4 w-4" aria-hidden />
      {scanLabel}
    </PressableButton>
  ) : (
    <PressableLink href={href} variant="button" className={buttonClassName}>
      <Plus className="h-4 w-4" aria-hidden />
      {scanLabel}
    </PressableLink>
  );

  return (
    <div className="space-y-2" data-tour="scan-fab">
      {scanControl}
      {manualEntryHref ? (
        <div className="text-center">
          <PressableLink
            href={manualEntryHref}
            nav="none"
            className="inline text-[0.78rem] font-medium text-[color:var(--vd-muted)] underline decoration-[color:var(--vd-border)] underline-offset-4"
          >
            Manuell eintragen
          </PressableLink>
        </div>
      ) : null}
    </div>
  );
}

/** Fixed bottom scan CTA with fade gradient (dashboard + document menus). */
export function DashboardScanFab({ hidden = false, ...ctaProps }: DashboardScanCtaProps) {
  const [mounted, setMounted] = useState(false);
  const [paywallOpen, setPaywallOpenState] = useState(false);
  const [promptPhase, setPromptPhase] = useState(
    () => getDashboardPromptSnapshot().phase,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPaywallOpenState(isPaywallOpen());
    return subscribePaywallOpen(() => {
      setPaywallOpenState(isPaywallOpen());
    });
  }, []);

  useEffect(() => {
    const syncPhase = () => {
      setPromptPhase(getDashboardPromptSnapshot().phase);
    };
    syncPhase();
    return subscribeDashboardPrompts(syncPhase);
  }, []);

  const blockedByPrompt =
    promptPhase === "silhouette" || promptPhase === "tour";

  if (!mounted || paywallOpen || hidden || blockedByPrompt) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
      data-tour="scan-fab-shell"
    >
      <div aria-hidden className="vd-fab-gradient h-28" />
      <div className="pointer-events-auto relative px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="mx-auto max-w-lg">
          <DashboardScanCta {...ctaProps} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
