"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

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
    "claim-cta w-full shadow-[var(--vd-shadow)]",
    scanLocked &&
      "bg-neutral-400 text-white shadow-none ring-1 ring-neutral-300/80",
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

  return (
    <div className="space-y-2" data-tour="scan-fab">
      {useScanButton ? (
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
        <PressableLink
          href={href}
          variant="button"
          className={buttonClassName}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {scanLabel}
        </PressableLink>
      )}
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
