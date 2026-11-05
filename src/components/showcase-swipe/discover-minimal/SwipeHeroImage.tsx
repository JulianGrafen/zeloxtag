"use client";

import { useState, type CSSProperties } from "react";

import { shareCardImageCrossOrigin } from "@/lib/share/share-card-image-cross-origin";
import { cn } from "@/lib/utils";

import { useSwipeHeroImage } from "./use-swipe-hero-image";

type SwipeHeroImageProps = {
  initialSrc: string | null | undefined;
  make: string;
  model: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
};

/** Native img — reliable in Capacitor / COEP (Next/Image breaks on some API heroes). */
export function SwipeHeroImage({
  initialSrc,
  make,
  model,
  alt,
  className,
  style,
  priority = false,
}: SwipeHeroImageProps) {
  const { displaySrc, onError, hasImage } = useSwipeHeroImage(
    initialSrc,
    make,
    model,
  );
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === displaySrc;

  if (!hasImage) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Capacitor + /api vehicle media
    <img
      src={displaySrc}
      alt={alt}
      draggable={false}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={() => setLoadedSrc(displaySrc)}
      crossOrigin={shareCardImageCrossOrigin(initialSrc ?? "", displaySrc)}
      className={cn(
        "absolute inset-0 h-full w-full transition-opacity duration-200 ease-out",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
      style={style}
      onError={onError}
    />
  );
}
