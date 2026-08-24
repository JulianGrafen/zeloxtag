"use client";

import { Plus } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";

interface DashboardScanFabProps {
  tagUuid: string;
  /** Prefer in-page scanner when provided. */
  onOpenScanner?: () => void;
  /** Secondary action — manual entry without receipt. */
  onManualEntry?: () => void;
  scanLabel?: string;
}

export function DashboardScanFab({
  tagUuid,
  onOpenScanner,
  onManualEntry,
  scanLabel = "Dokument scannen",
}: DashboardScanFabProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
      data-tour="scan-fab"
    >
      <div aria-hidden className="vd-fab-gradient h-28" />
      <div className="pointer-events-auto relative space-y-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="mx-auto max-w-lg">
          {onOpenScanner ? (
            <PressableButton
              type="button"
              variant="button"
              onClick={onOpenScanner}
              className="claim-cta shadow-[var(--vd-shadow)]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {scanLabel}
            </PressableButton>
          ) : (
            <PressableLink
              href={`/v/${tagUuid}?scan=1`}
              variant="button"
              className="claim-cta shadow-[var(--vd-shadow)]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {scanLabel}
            </PressableLink>
          )}
        </div>
        {onManualEntry ? (
          <div className="mx-auto max-w-lg text-center">
            <button
              type="button"
              onClick={onManualEntry}
              className="text-[0.78rem] font-medium text-[color:var(--vd-muted)] underline decoration-[color:var(--vd-border)] underline-offset-4"
            >
              Manuell eintragen
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
