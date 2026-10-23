"use client";

import { toShareCardImageFetchUrl } from "@/lib/share/share-card-hero-image-url";
import {
  shareCardHeroImageClassName,
  shareCardImageCrossOrigin,
} from "@/lib/share/share-card-image-cross-origin";
import { showroom } from "@/components/public-showcase/showroom-styles";
import { cn } from "@/lib/utils";

type ShareCardHeroMediaProps = {
  imageUrl: string;
  onError: () => void;
  /** Rank-hero style adds a left vignette for the badge. */
  variant?: "showcase" | "rank";
};

/** Full-bleed hero photo with showcase-style top/bottom fades (export-safe). */
export function ShareCardHeroMedia({
  imageUrl,
  onError,
  variant = "showcase",
}: ShareCardHeroMediaProps) {
  const fetchUrl = toShareCardImageFetchUrl(imageUrl);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- DOM export */}
      <img
        data-share-card-hero=""
        src={fetchUrl}
        alt=""
        crossOrigin={shareCardImageCrossOrigin(imageUrl, fetchUrl)}
        className={shareCardHeroImageClassName(imageUrl, variant)}
        onError={onError}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-[2]",
          variant === "rank"
            ? "h-[22%] bg-gradient-to-b from-black/70 to-transparent"
            : showroom.heroBackdropTopFade,
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-[4]",
          variant === "rank"
            ? "h-[min(55%,26rem)] bg-gradient-to-t from-black from-0% via-black/88 via-[45%] to-transparent"
            : showroom.heroBackdropBottomFade,
        )}
        aria-hidden
      />
    </>
  );
}
