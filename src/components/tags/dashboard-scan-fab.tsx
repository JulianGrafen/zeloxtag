"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  isPaywallOpen,
  subscribePaywallOpen,
} from "@/lib/billing/paywall-open-state";

export interface DashboardScanCtaProps {
  tagUuid: string;
  /** Prefer in-page scanner when provided. */
  onOpenScanner?: () => void;
  /** Direct link to scan flow (sub-pages without in-page picker). */
  scanHref?: string;
  /** Link to the manual entry page (no receipt / KI scan). */
  manualEntryHref?: string;
  scanLabel?: string;
}

export function DashboardScanCta({
  tagUuid,
  onOpenScanner,
  scanHref,
  manualEntryHref,
  scanLabel = "Dokument scannen",
}: DashboardScanCtaProps) {
  const href = scanHref ?? `/v/${tagUuid}?scan=1`;

  return (
    <div className="space-y-2" data-tour="scan-fab">
      {onOpenScanner ? (
        <PressableButton
          type="button"
          variant="button"
          onClick={onOpenScanner}
          className="claim-cta w-full shadow-[var(--vd-shadow)]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {scanLabel}
        </PressableButton>
      ) : (
        <PressableLink
          href={href}
          variant="button"
          className="claim-cta w-full shadow-[var(--vd-shadow)]"
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
export function DashboardScanFab(props: DashboardScanCtaProps) {
  const [mounted, setMounted] = useState(false);
  const [paywallOpen, setPaywallOpenState] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPaywallOpenState(isPaywallOpen());
    return subscribePaywallOpen(() => {
      setPaywallOpenState(isPaywallOpen());
    });
  }, []);

  if (!mounted || paywallOpen) {
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
          <DashboardScanCta {...props} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
