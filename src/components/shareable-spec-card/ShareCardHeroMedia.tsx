"use client";

import {
  shareCardHeroImageClassName,
  shareCardImageCrossOrigin,
} from "@/lib/share/share-card-image-cross-origin";
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
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- DOM export */}
      <img
        src={imageUrl}
        alt=""
        crossOrigin={shareCardImageCrossOrigin(imageUrl)}
        className={shareCardHeroImageClassName(imageUrl, variant)}
        onError={onError}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-[2] bg-gradient-to-b from-black/70 to-transparent",
          variant === "rank" ? "h-[22%]" : "h-[28%]",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-[4] bg-gradient-to-t from-[#0a0a0a] from-0% via-[#0a0a0a]/85 to-transparent",
          variant === "rank"
            ? "h-[min(42%,18rem)] via-[38%]"
            : "h-[min(52%,24rem)] via-[42%]",
        )}
        aria-hidden
      />
      {variant === "rank" ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-[45%] bg-gradient-to-r from-black/75 to-transparent"
          aria-hidden
        />
      ) : null}
    </>
  );
}
