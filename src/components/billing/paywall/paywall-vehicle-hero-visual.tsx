"use client";

import { useEffect, useRef, useState } from "react";

import { bumpSilhouetteCacheUrl } from "@/lib/vehicles/prefetch-silhouette-image";
import { SILHOUETTE_DASHBOARD_THUMB_MAX_EDGE } from "@/lib/vehicles/silhouette-constants";
import { isOwnerSilhouetteSrc } from "@/lib/vehicles/silhouette-display-url";
import type { VehicleHeroDisplay } from "@/lib/vehicles/resolve-vehicle-hero-display";
import { cn } from "@/lib/utils";

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

function resolveInitialHeroSrc(
  vehicleImage?: string | null,
  previewFallback?: string | null,
  catalogFallback?: string | null,
): string | null {
  const raw =
    vehicleImage?.trim() ||
    previewFallback?.trim() ||
    catalogFallback?.trim() ||
    null;
  return raw ? withDashboardSilhouetteWidth(raw) : null;
}

function isCatalogCutoutSrc(src: string | null): boolean {
  return Boolean(src?.includes("/api/vehicle/catalog/"));
}

export type PaywallVehicleHeroProps = Pick<
  VehicleHeroDisplay,
  | "vehicleImage"
  | "vehicleImageFallback"
  | "vehicleImagePreviewFallback"
  | "vehicleImageFrameless"
  | "vehicleImageAlt"
> & {
  className?: string;
  ariaLabel?: string;
};

export function PaywallVehicleHeroVisual({
  vehicleImage,
  vehicleImageFallback,
  vehicleImagePreviewFallback,
  vehicleImageFrameless = false,
  vehicleImageAlt,
  className,
  ariaLabel,
}: PaywallVehicleHeroProps) {
  const primary = vehicleImage?.trim() || null;
  const previewFallback = vehicleImagePreviewFallback?.trim() || null;
  const catalogFallback = vehicleImageFallback?.trim() || null;
  const ownerLocked =
    isOwnerSilhouetteSrc(primary) || isOwnerSilhouetteSrc(vehicleImage);

  const [heroSrc, setHeroSrc] = useState<string | null>(() =>
    resolveInitialHeroSrc(vehicleImage, vehicleImagePreviewFallback, vehicleImageFallback),
  );
  const [heroVisible, setHeroVisible] = useState(Boolean(heroSrc));
  const [imageLoaded, setImageLoaded] = useState(false);
  const [proxyRetries, setProxyRetries] = useState(0);
  const [usedPreviewFallback, setUsedPreviewFallback] = useState(false);

  useEffect(() => {
    setHeroSrc(
      resolveInitialHeroSrc(vehicleImage, vehicleImagePreviewFallback, vehicleImageFallback),
    );
    setHeroVisible(
      Boolean(
        resolveInitialHeroSrc(
          vehicleImage,
          vehicleImagePreviewFallback,
          vehicleImageFallback,
        ),
      ),
    );
    setImageLoaded(false);
    setProxyRetries(0);
    setUsedPreviewFallback(false);
  }, [vehicleImage, vehicleImagePreviewFallback, vehicleImageFallback]);

  function handleHeroError() {
    if (
      !usedPreviewFallback &&
      previewFallback &&
      heroSrc !== previewFallback
    ) {
      setUsedPreviewFallback(true);
      setHeroSrc(previewFallback);
      setHeroVisible(true);
      setImageLoaded(false);
      return;
    }
    if (catalogFallback && heroSrc !== catalogFallback) {
      setHeroSrc(catalogFallback);
      setHeroVisible(true);
      setImageLoaded(false);
      return;
    }
    if (
      ownerLocked &&
      heroSrc &&
      heroSrc.startsWith("/api/vehicle/silhouette/") &&
      proxyRetries < 2
    ) {
      setProxyRetries((n) => n + 1);
      setHeroSrc(bumpSilhouetteCacheUrl(heroSrc));
      return;
    }
    setHeroVisible(false);
  }

  const displaySrc = heroSrc ? withDashboardSilhouetteWidth(heroSrc) : null;
  const isCutoutHero =
    vehicleImageFrameless || isCatalogCutoutSrc(displaySrc);
  const isOwnerPhoto =
    Boolean(displaySrc) &&
    !isCutoutHero &&
    isOwnerSilhouetteSrc(displaySrc);
  const showPhoto = Boolean(displaySrc && heroVisible);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!displaySrc) {
      setImageLoaded(false);
      return;
    }
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [displaySrc]);

  return (
    <figure
      className={cn(
        "relative w-full overflow-hidden bg-[color:var(--paywall-sheet-bg)]",
        "min-h-[10.75rem] sm:min-h-[11.5rem]",
        isCutoutHero && "min-h-[11.25rem] sm:min-h-[12rem]",
        className,
      )}
      aria-label={ariaLabel ?? vehicleImageAlt}
    >
      {showPhoto ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            key={displaySrc}
            src={displaySrc!}
            alt=""
            decoding="async"
            fetchPriority="high"
            className={cn(
              "absolute left-0 right-0 mx-auto w-full max-w-none transition-opacity duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              imageLoaded ? "opacity-100" : "opacity-0",
              isCutoutHero
                ? "bottom-3 h-[118%] max-w-full object-contain object-bottom brightness-[1.06] contrast-[1.04] drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
                : cn(
                    "inset-0 h-full object-cover brightness-[1.03]",
                    isOwnerPhoto ? "object-[50%_62%]" : "object-[50%_55%]",
                  ),
            )}
            onLoad={() => {
              setHeroVisible(true);
              setImageLoaded(true);
            }}
            onError={handleHeroError}
          />
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-[color:var(--paywall-sheet-bg)] to-transparent",
              isCutoutHero
                ? "via-zinc-950/10"
                : "via-zinc-950/50 to-zinc-950/5",
            )}
          />
          {!isCutoutHero ? (
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/45 via-zinc-950/8 to-transparent" />
          ) : null}
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-14 bg-gradient-to-b to-transparent",
              isCutoutHero ? "from-zinc-950/30" : "from-zinc-950/65",
            )}
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-[color:var(--paywall-sheet-bg)] to-transparent",
              isCutoutHero
                ? "h-24 via-[color:var(--paywall-sheet-bg)]/35"
                : "h-28 via-[color:var(--paywall-sheet-bg)]/55",
            )}
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.04)_0%,transparent_50%)]"
        />
      )}
      {vehicleImageAlt ? (
        <span className="sr-only">{vehicleImageAlt}</span>
      ) : null}
    </figure>
  );
}
