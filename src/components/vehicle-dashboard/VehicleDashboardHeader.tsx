"use client";

import { useState } from "react";

import { AnimatedVehicleHeader } from "@/components/dashboard/AnimatedVehicleHeader";
import { isOwnerSilhouetteSrc } from "@/lib/vehicles/silhouette-display-url";

import { dashboardHeroShellClassName } from "./dashboard-menu-styles";

interface VehicleDashboardHeaderProps {
  ownerName: string;
  vehicleModel: string;
  vehicleImage?: string;
  vehicleImageFallback?: string;
  vehicleImagePreviewFallback?: string;
  vehicleImageAlt?: string;
  vehicleImageFrameless?: boolean;
  statusLabel?: string;
  onEditVehicleImage?: () => void;
  onSilhouetteProxyLoad?: () => void;
}

function parseVehicleHeroLabel(vehicleModel: string): {
  name: string;
  year: string | null;
} {
  const parts = vehicleModel.split(" · ");
  if (parts.length >= 2) {
    const yearCandidate = parts[parts.length - 1]?.trim() ?? "";
    if (/^\d{4}$/.test(yearCandidate)) {
      return {
        name: parts.slice(0, -1).join(" · ").trim(),
        year: yearCandidate,
      };
    }
  }
  return { name: vehicleModel.trim(), year: null };
}

function formatOwnerPossessive(ownerName: string): string {
  const trimmed = ownerName.trim();
  if (!trimmed) return "";
  if (/[sxzß]$/i.test(trimmed)) {
    return `${trimmed}'`;
  }
  return `${trimmed}s`;
}

function buildHeroTitle(ownerName: string, vehicleName: string): string {
  const owner = ownerName.trim();
  if (!owner || owner === "Fahrer") {
    return vehicleName;
  }
  return `${formatOwnerPossessive(owner)} ${vehicleName}`;
}

export function VehicleDashboardHeader({
  ownerName,
  vehicleModel,
  vehicleImage,
  vehicleImageFallback,
  vehicleImagePreviewFallback,
  vehicleImageAlt,
  vehicleImageFrameless = false,
  statusLabel = "Verbunden",
  onEditVehicleImage,
  onSilhouetteProxyLoad,
}: VehicleDashboardHeaderProps) {
  const { name, year } = parseVehicleHeroLabel(vehicleModel);
  const heroTitle = buildHeroTitle(ownerName, name);
  const heroBgSrc =
    vehicleImage?.trim() ||
    vehicleImagePreviewFallback?.trim() ||
    vehicleImageFallback?.trim() ||
    null;
  const [heroBgVisible, setHeroBgVisible] = useState(Boolean(heroBgSrc));

  return (
    <header className={`${dashboardHeroShellClassName} min-h-[11.5rem] sm:min-h-[12.5rem]`}>
      {heroBgSrc && heroBgVisible ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroBgSrc}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover object-[center_35%] opacity-[0.38]"
            onError={() => setHeroBgVisible(false)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/82 to-zinc-950/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-zinc-950/20" />
        </div>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.04)_0%,transparent_50%)]"
        />
      )}

      <div className="relative grid grid-cols-1 items-end gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:p-6">
        <div className="min-w-0 space-y-3 pl-5 sm:pl-8">
          <p className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <span>{statusLabel}</span>
            <span className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center">
              <span className="vd-connected-dot" aria-label="Verbunden" />
            </span>
          </p>
          <div className="space-y-1.5">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
              {heroTitle}
            </h1>
            {year ? (
              <p className="text-xs text-zinc-400 tabular-nums">
                Baujahr {year}
              </p>
            ) : null}
          </div>
        </div>

        <AnimatedVehicleHeader
          size="hero"
          silhouetteImageUrl={vehicleImage}
          previewFallbackUrl={vehicleImagePreviewFallback}
          fallbackImageUrl={vehicleImageFallback}
          lockOwnerSilhouette={isOwnerSilhouetteSrc(vehicleImage)}
          frameless={vehicleImageFrameless}
          alt={vehicleImageAlt ?? heroTitle}
          onEdit={onEditVehicleImage}
          onPrimaryLoad={onSilhouetteProxyLoad}
          className="justify-self-end"
        />
      </div>
    </header>
  );
}
