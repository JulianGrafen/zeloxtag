"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { bumpSilhouetteCacheUrl } from "@/lib/vehicles/prefetch-silhouette-image";
import { SILHOUETTE_DASHBOARD_THUMB_MAX_EDGE } from "@/lib/vehicles/silhouette-constants";
import { isOwnerSilhouetteSrc } from "@/lib/vehicles/silhouette-display-url";
import { isOpaqueCatalogPhotoSrc } from "@/lib/vehicles/vehicle-image";

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
  /** Bleed hero into horizontal page padding (full-bleed under sticky chrome). */
  heroFlush?: boolean;
  /** Rounded hero shell (demo / embedded dashboard). */
  heroRounded?: boolean;
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
  heroFlush = false,
  heroRounded = false,
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
  const opaqueCatalogPhoto = isOpaqueCatalogPhotoSrc(displaySrc);
  const framelessHero = vehicleImageFrameless && isCutoutHero;
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
        isOwnerPhoto &&
          "vd-hero-dashboard--owner-photo min-h-[12.25rem] sm:min-h-[13.75rem]",
        framelessHero &&
          "border-0 bg-black shadow-none [background-image:none]",
        framelessHero && !heroRounded && "rounded-none",
        heroFlush && !heroRounded && "-mx-4 w-auto sm:-mx-5",
        opaqueCatalogPhoto && framelessHero && "min-h-[12.5rem] sm:min-h-[13.5rem]",
      )}
      data-tour="dashboard-header"
      style={
        framelessHero
          ? ({ "--vd-hero-vignette": "#000000" } as CSSProperties)
          : undefined
      }
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
              "vd-hero-dashboard-media absolute left-0 right-0 mx-auto w-full max-w-none",
              isCutoutHero
                ? opaqueCatalogPhoto
                  ? "inset-0 h-full scale-[1.06] object-cover object-[50%_56%]"
                  : "bottom-0 h-[128%] max-w-full object-contain object-bottom drop-shadow-[0_18px_42px_rgba(0,0,0,0.55)]"
                : cn(
                    "inset-0 h-full object-cover",
                    isOwnerPhoto
                      ? "object-[50%_58%] vd-hero-photo-mask brightness-[0.9] contrast-[1.08] saturate-[0.96]"
                      : "object-[50%_55%]",
                  ),
            )}
            onLoad={handleHeroLoad}
            onError={handleHeroError}
          />
          {isCutoutHero ? (
            <div
              aria-hidden
              className="absolute bottom-[6%] left-1/2 h-14 w-[min(92%,22rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.04)_42%,transparent_72%)] blur-[2px]"
            />
          ) : null}
          <div
            aria-hidden
            className={cn(
              "vd-hero-cinematic-vignette",
              isCutoutHero && "vd-hero-cinematic-vignette--cutout",
              isOwnerPhoto && "vd-hero-cinematic-vignette--photo",
            )}
          />
          {isOwnerPhoto ? (
            <div
              aria-hidden
              className="vd-hero-dashboard-grain absolute inset-0"
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
        <div className="relative z-[1] min-w-0">
          <h1 className="vd-hero-dashboard-title">
            {ownerLabel ? (
              <>
                <span className="font-medium text-white/78">{ownerLabel}</span>{" "}
                <span>{name}</span>
              </>
            ) : (
              name
            )}
          </h1>
          {year ? <p className="vd-hero-dashboard-year">{year}</p> : null}
        </div>
      </div>

      {/* Screen readers: decorative hero uses empty alt; name is in h1 */}
      {showPhoto && vehicleImageAlt ? (
        <span className="sr-only">{vehicleImageAlt}</span>
      ) : null}
    </header>
  );
}
