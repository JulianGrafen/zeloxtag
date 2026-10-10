"use client";

import { useEffect, useState } from "react";
import { bumpSilhouetteCacheUrl } from "@/lib/vehicles/prefetch-silhouette-image";
import { isOwnerSilhouetteSrc } from "@/lib/vehicles/silhouette-display-url";

import { dashboardHeroShellClassName } from "./dashboard-menu-styles";
import { cn } from "@/lib/utils";

interface VehicleDashboardHeaderProps {
  ownerName?: string;
  vehicleModel: string;
  vehicleImage?: string;
  vehicleImageFallback?: string;
  vehicleImagePreviewFallback?: string;
  vehicleImageAlt?: string;
  vehicleImageFrameless?: boolean;
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

function resolveInitialHeroSrc(
  vehicleImage?: string,
  previewFallback?: string,
  catalogFallback?: string,
): string | null {
  return (
    vehicleImage?.trim() ||
    previewFallback?.trim() ||
    catalogFallback?.trim() ||
    null
  );
}

export function VehicleDashboardHeader({
  ownerName,
  vehicleModel,
  vehicleImage,
  vehicleImageFallback,
  vehicleImagePreviewFallback,
  vehicleImageAlt,
  vehicleImageFrameless: _vehicleImageFrameless = false,
  onSilhouetteProxyLoad,
}: VehicleDashboardHeaderProps) {
  const { name, year } = parseVehicleHeroLabel(vehicleModel);
  const ownerLabel = ownerName?.trim() || null;
  const primary = vehicleImage?.trim() || null;
  const previewFallback = vehicleImagePreviewFallback?.trim() || null;
  const catalogFallback = vehicleImageFallback?.trim() || null;
  const ownerLocked =
    isOwnerSilhouetteSrc(primary) || isOwnerSilhouetteSrc(vehicleImage);

  const [heroSrc, setHeroSrc] = useState<string | null>(() =>
    resolveInitialHeroSrc(vehicleImage, vehicleImagePreviewFallback, vehicleImageFallback),
  );
  const [heroVisible, setHeroVisible] = useState(Boolean(heroSrc));
  const [proxyRetries, setProxyRetries] = useState(0);
  const [usedPreviewFallback, setUsedPreviewFallback] = useState(false);

  useEffect(() => {
    const next = resolveInitialHeroSrc(
      vehicleImage,
      vehicleImagePreviewFallback,
      vehicleImageFallback,
    );
    setHeroSrc(next);
    setHeroVisible(Boolean(next));
    setProxyRetries(0);
    setUsedPreviewFallback(false);
  }, [vehicleImage, vehicleImagePreviewFallback, vehicleImageFallback]);

  function handleHeroError() {
    if (
      heroSrc?.startsWith("blob:") ||
      heroSrc?.startsWith("data:image/")
    ) {
      return;
    }
    if (
      isOwnerSilhouetteSrc(heroSrc) &&
      proxyRetries < 6 &&
      typeof window !== "undefined"
    ) {
      setProxyRetries((count) => count + 1);
      setHeroSrc(bumpSilhouetteCacheUrl(heroSrc!));
      return;
    }
    if (
      (ownerLocked || isOwnerSilhouetteSrc(heroSrc)) &&
      previewFallback &&
      !usedPreviewFallback &&
      heroSrc !== previewFallback
    ) {
      setUsedPreviewFallback(true);
      setHeroSrc(previewFallback);
      return;
    }
    if (ownerLocked || isOwnerSilhouetteSrc(heroSrc)) {
      return;
    }
    if (catalogFallback && heroSrc !== catalogFallback) {
      setHeroSrc(catalogFallback);
      return;
    }
    setHeroVisible(false);
    setHeroSrc(null);
  }

  function handleHeroLoad() {
    if (
      isOwnerSilhouetteSrc(heroSrc) &&
      heroSrc &&
      !heroSrc.startsWith("blob:") &&
      !heroSrc.startsWith("data:image/")
    ) {
      onSilhouetteProxyLoad?.();
    }
  }

  const showPhoto = Boolean(heroSrc && heroVisible);

  return (
    <header
      className={cn(
        dashboardHeroShellClassName,
        "vd-anim-header relative z-40 min-h-[11rem] shrink-0 overflow-hidden sm:min-h-[12rem]",
      )}
      data-tour="dashboard-header"
    >
      {showPhoto ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={heroSrc}
            src={heroSrc!}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover object-[center_30%]"
            onLoad={handleHeroLoad}
            onError={handleHeroError}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/15"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/25 to-transparent"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.04)_0%,transparent_50%)]"
        />
      )}

      <div
        className="relative flex min-h-[11rem] flex-col justify-end px-4 pb-5 pt-8 sm:min-h-[12rem] sm:px-5 sm:pb-6"
      >
        <div className="min-w-0">
          <h1
            className="font-[family-name:var(--font-display)] text-[1.35rem] leading-tight tracking-tight text-white drop-shadow-sm sm:text-[1.45rem]"
          >
            {ownerLabel ? (
              <>
                <span className="font-medium text-white/80">{ownerLabel}</span>{" "}
                <span className="font-bold text-white">{name}</span>
              </>
            ) : (
              <span className="font-bold">{name}</span>
            )}
          </h1>
          {year ? (
            <p className="mt-1.5 text-[0.8rem] tabular-nums text-zinc-300">
              {year}
            </p>
          ) : null}
        </div>
      </div>

      {/* Screen readers: decorative hero uses empty alt; name is in h1 */}
      {showPhoto && vehicleImageAlt ? (
        <span className="sr-only">{vehicleImageAlt}</span>
      ) : null}
    </header>
  );
}
