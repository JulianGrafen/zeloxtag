"use client";

import { useEffect, useState } from "react";
import { bumpSilhouetteCacheUrl } from "@/lib/vehicles/prefetch-silhouette-image";
import { SILHOUETTE_DASHBOARD_THUMB_MAX_EDGE } from "@/lib/vehicles/silhouette-constants";
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
  const raw =
    vehicleImage?.trim() ||
    previewFallback?.trim() ||
    catalogFallback?.trim() ||
    null;
  return raw ? withDashboardSilhouetteWidth(raw) : null;
}

/** Bump legacy `w=340` proxy URLs to the current dashboard hero cap. */
function withDashboardSilhouetteWidth(src: string): string {
  if (!src.startsWith("/api/vehicle/silhouette/")) {
    return src;
  }
  try {
    const parsed = new URL(src, "http://zeloxtag.local");
    const current = Number.parseInt(parsed.searchParams.get("w") ?? "", 10);
    const target = SILHOUETTE_DASHBOARD_THUMB_MAX_EDGE;
    if (!Number.isFinite(current) || current < target) {
      parsed.searchParams.set("w", String(target));
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return src;
  }
  return src;
}

function isCatalogCutoutSrc(src: string | null): boolean {
  return Boolean(src?.includes("/api/vehicle/catalog/"));
}

export function VehicleDashboardHeader({
  ownerName,
  vehicleModel,
  vehicleImage,
  vehicleImageFallback,
  vehicleImagePreviewFallback,
  vehicleImageAlt,
  vehicleImageFrameless = false,
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

  const displaySrc = heroSrc ? withDashboardSilhouetteWidth(heroSrc) : null;
  const isCutoutHero =
    vehicleImageFrameless || isCatalogCutoutSrc(displaySrc);
  const isOwnerPhoto =
    Boolean(displaySrc) &&
    !isCutoutHero &&
    isOwnerSilhouetteSrc(displaySrc);
  const showPhoto = Boolean(displaySrc && heroVisible);

  return (
    <header
      className={cn(
        dashboardHeroShellClassName,
        "vd-anim-header relative z-40 min-h-[11rem] shrink-0 overflow-hidden sm:min-h-[12rem]",
        isCutoutHero && "min-h-[12rem] sm:min-h-[13rem]",
      )}
      data-tour="dashboard-header"
    >
      {showPhoto ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={displaySrc}
            src={displaySrc!}
            alt=""
            decoding="async"
            fetchPriority="high"
            className={cn(
              "absolute left-0 right-0 mx-auto w-full max-w-none",
              isCutoutHero
                ? "bottom-0 h-[128%] max-w-[112%] object-contain object-bottom drop-shadow-[0_18px_42px_rgba(0,0,0,0.55)]"
                : cn(
                    "inset-0 h-full object-cover",
                    isOwnerPhoto
                      ? "object-[50%_62%]"
                      : "object-[50%_55%]",
                  ),
            )}
            onLoad={handleHeroLoad}
            onError={handleHeroError}
          />
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-zinc-950",
              isCutoutHero
                ? "via-zinc-950/35 to-transparent"
                : "via-zinc-950/50 to-zinc-950/5",
            )}
          />
          {!isCutoutHero ? (
            <div
              className="absolute inset-0 bg-gradient-to-r from-zinc-950/65 via-zinc-950/10 to-transparent"
            />
          ) : null}
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
