"use client";

import { Plus } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";

interface DashboardScanCtaProps {
  tagUuid: string;
  /** Prefer in-page scanner when provided. */
  onOpenScanner?: () => void;
  /** Link to the manual entry page (no receipt / KI scan). */
  manualEntryHref?: string;
  scanLabel?: string;
}

export function DashboardScanCta({
  tagUuid,
  onOpenScanner,
  manualEntryHref,
  scanLabel = "Dokument scannen",
}: DashboardScanCtaProps) {
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
          href={`/v/${tagUuid}?scan=1`}
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

/** @deprecated Use inline `DashboardScanCta` in the dashboard tile grid. */
export function DashboardScanFab(props: DashboardScanCtaProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div aria-hidden className="vd-fab-gradient h-28" />
      <div className="pointer-events-auto relative px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="mx-auto max-w-lg">
          <DashboardScanCta {...props} />
        </div>
      </div>
    </div>
  );
}
