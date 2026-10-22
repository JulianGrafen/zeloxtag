"use client";

import Image from "next/image";
import { ChevronRight, Heart } from "lucide-react";

import { showroom } from "@/components/public-showcase/showroom-styles";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import { cn } from "@/lib/utils";

import { resolveSwipeCardHeroPresentation } from "./swipe-card-hero-utils";

function buildSubtitle(card: ShowcaseSwipeCard): string {
  const parts: string[] = [];
  if (card.powerPs != null && card.powerPs > 0) {
    parts.push(`${card.powerPs} PS`);
  }
  if (card.torqueNm != null && card.torqueNm > 0) {
    parts.push(`${card.torqueNm} Nm`);
  }
  if (card.modificationCount > 0) {
    parts.push(`${card.modificationCount} Mods`);
  } else if (parts.length === 0) {
    parts.push("Showcase");
  }
  return parts.join(" • ");
}

type SwipeCardMinimalProps = {
  card: ShowcaseSwipeCard;
  className?: string;
  imagePriority?: boolean;
  onOpenDetails?: () => void;
  /** Stack depth > 0: poster only (no chrome overlap). */
  variant?: "front" | "back";
};

export function SwipeCardMinimal({
  card,
  className,
  imagePriority = false,
  onOpenDetails,
  variant = "front",
}: SwipeCardMinimalProps) {
  const isBack = variant === "back";
  const title = [card.make, card.model].filter(Boolean).join(" ") || card.make;
  const yearLabel = card.year != null ? String(card.year) : null;
  const heroSrc = card.heroImageSrc?.trim() ?? "";
  const heroPresentation = heroSrc
    ? resolveSwipeCardHeroPresentation(heroSrc, card.heroImageUsesCover)
    : null;

  return (
    <div
      className={cn(
        "relative flex h-full w-full min-h-0 flex-col overflow-hidden bg-neutral-950 text-white shadow-[0_16px_40px_rgba(0,0,0,0.38)] ring-1 ring-white/10",
        className,
      )}
    >
      {heroSrc ? (
        <Image
          src={heroSrc}
          alt={title}
          fill
          draggable={false}
          priority={imagePriority}
          loading={imagePriority ? "eager" : "lazy"}
          className={cn(
            "pointer-events-none z-0",
            heroPresentation?.imageClassName,
          )}
          style={
            heroPresentation
              ? { objectFit: heroPresentation.objectFit }
              : undefined
          }
          sizes="(max-width: 512px) 100vw, 480px"
          unoptimized={heroSrc.startsWith("/api/")}
        />
      ) : (
        <div
          className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"
          aria-hidden
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 78%, rgba(255,255,255,0.12), transparent 55%)",
            }}
          />
        </div>
      )}

      <div className={cn(showroom.heroBackdropTopFade, "z-[1]")} aria-hidden />
      <div className={cn(showroom.heroBackdropBottomFade, "z-[1]")} aria-hidden />
      <div className={cn(showroom.heroCopyBottomFade, "z-[1]")} aria-hidden />

      {card.totalLikes > 0 && !isBack ? (
        <div
          className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur-md"
          aria-label={`${card.totalLikes} Likes gesamt`}
        >
          <Heart
            className="h-3.5 w-3.5 text-rose-400"
            fill="currentColor"
            aria-hidden
          />
          <span className="font-mono text-[0.78rem] font-semibold tabular-nums text-white">
            {card.totalLikes}
          </span>
        </div>
      ) : null}

      {isBack ? null : (
      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-end px-4 pb-[7.25rem] pt-14">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[1.05rem] font-semibold tracking-tight text-white">
            {title}
          </p>
          {yearLabel ? (
            <span className="shrink-0 text-[0.78rem] text-white/55">
              {yearLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[0.78rem] text-white/55">{buildSubtitle(card)}</p>
        <button
          type="button"
          className="pointer-events-auto mt-2.5 inline-flex min-h-10 items-center gap-0.5 rounded-full bg-white/10 px-3 py-2 text-[0.78rem] font-medium text-white ring-1 ring-white/15 backdrop-blur-sm transition active:scale-[0.98] active:opacity-90"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetails?.();
          }}
        >
          Showcase ansehen
          <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
        </button>
      </div>
      )}
    </div>
  );
}
