"use client";

import {
  shareCardHeroImageClassName,
  shareCardImageCrossOrigin,
} from "@/lib/share/share-card-image-cross-origin";

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
        className={shareCardHeroImageClassName(imageUrl)}
        onError={onError}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[32%] bg-gradient-to-b from-black/70 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[min(62%,28rem)] bg-gradient-to-t from-[#0a0a0a] from-0% via-[#0a0a0a]/85 via-[42%] to-transparent"
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
