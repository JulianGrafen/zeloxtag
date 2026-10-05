"use client";

import { useMemo, useState } from "react";
import { Car, Tag, X } from "lucide-react";

import { LinkTagModal } from "@/components/hardware/link-tag-modal";
import { useGarageOptional } from "@/lib/garage/use-garage";
import { cn } from "@/lib/utils";

export const GARAGE_TAG_OFFLINE_STATUS_LABEL =
  "Status: Offline (Kein V4A-Tag gekoppelt)";

type GarageTagCouplingStatusProps = {
  className?: string;
  /** When set, overrides garage context (e.g. server-known scope). */
  vehicleId?: string;
  linkedTagUuid?: string | null;
};

/**
 * Fixed top-right indicator for digital garage without a linked V4A tag.
 * Tapping opens the tag-link flow (completion nudge).
 */
export function GarageTagCouplingStatus({
  className,
  vehicleId: vehicleIdOverride,
  linkedTagUuid: linkedTagOverride,
}: GarageTagCouplingStatusProps) {
  const garage = useGarageOptional();
  const [linkOpen, setLinkOpen] = useState(false);

  const activeEntry = useMemo(() => {
    if (!garage) return null;
    return (
      garage.userVehicles.find(
        (entry) => entry.vehicleId === garage.activeVehicleId,
      ) ?? garage.userVehicles[0] ??
      null
    );
  }, [garage]);

  const vehicleId = vehicleIdOverride ?? activeEntry?.vehicleId ?? null;
  const linkedTagUuid =
    linkedTagOverride !== undefined
      ? linkedTagOverride
      : activeEntry?.tagUuid ?? garage?.routeScope.linkedTagUuid ?? null;

  if (!vehicleId || linkedTagUuid) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "fixed right-4 z-[60] flex max-w-[min(100vw-2rem,18rem)] items-center gap-2 rounded-full border border-rose-500/35 bg-zinc-950/88 px-2.5 py-1.5 text-left shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:border-rose-400/55 hover:bg-zinc-950/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400/70",
          "top-[max(0.65rem,env(safe-area-inset-top))]",
          className,
        )}
        aria-label={GARAGE_TAG_OFFLINE_STATUS_LABEL}
        title={GARAGE_TAG_OFFLINE_STATUS_LABEL}
        onClick={() => setLinkOpen(true)}
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900/90 ring-1 ring-white/10">
          <Car className="h-4 w-4 text-zinc-100" strokeWidth={1.75} aria-hidden />
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 ring-1 ring-rose-500/50"
            aria-hidden
          >
            <Tag className="h-2.5 w-2.5 text-rose-300/90" strokeWidth={2} />
            <X
              className="absolute h-3 w-3 text-rose-400"
              strokeWidth={2.75}
            />
          </span>
          <span className="vd-offline-dot pointer-events-none" aria-hidden />
        </span>
        <span className="min-w-0 pr-0.5">
          <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-rose-400/95">
            Offline
          </span>
          <span className="block truncate text-[0.7rem] leading-tight text-zinc-300">
            Kein V4A-Tag gekoppelt
          </span>
        </span>
      </button>

      <LinkTagModal
        open={linkOpen}
        vehicleId={vehicleId}
        onClose={() => setLinkOpen(false)}
      />
    </>
  );
}

/** Renders the status chip when wrapped in {@link GarageProvider}. */
export function GarageTagCouplingStatusHost() {
  return <GarageTagCouplingStatus />;
}
