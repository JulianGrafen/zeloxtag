"use client";

import { Plus } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";

interface DashboardScanFabProps {
  tagUuid: string;
  /** Prefer in-page scanner when provided. */
  onOpenScanner?: () => void;
}

export function DashboardScanFab({
  tagUuid,
  onOpenScanner,
}: DashboardScanFabProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
      <div className="pointer-events-auto mx-auto max-w-lg">
        {onOpenScanner ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={onOpenScanner}
            className="claim-cta shadow-[var(--vd-shadow)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Dokument scannen
          </PressableButton>
        ) : (
          <PressableLink
            href={`/v/${tagUuid}?scan=1`}
            variant="button"
            className="claim-cta shadow-[var(--vd-shadow)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Dokument scannen
          </PressableLink>
        )}
      </div>
    </div>
  );
}
