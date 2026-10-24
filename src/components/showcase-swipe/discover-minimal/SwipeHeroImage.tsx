"use client";

import type { CSSProperties } from "react";

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

  if (!hasImage) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Capacitor + /api vehicle media
    <img
      src={displaySrc}
      alt={alt}
      draggable={false}
      decoding={priority ? "sync" : "async"}
      loading={priority ? "eager" : "lazy"}
      className={cn("absolute inset-0 h-full w-full", className)}
      style={style}
      onError={onError}
    />
  );
}
