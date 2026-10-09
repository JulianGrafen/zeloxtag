"use client";

import Link from "next/link";

import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { isTopThreeRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { cn } from "@/lib/utils";

function rankAccentBorder(rank: number): string {
  if (rank === 1) return "border-amber-400/35 from-amber-950/40 to-black";
  if (rank === 2) return "border-zinc-300/25 from-zinc-800/50 to-black";
  if (rank === 3) return "border-orange-700/35 from-orange-950/30 to-black";
  return "border-white/[0.08] from-zinc-900 to-black";
}

type ShowcaseWeeklyPlacementProps = {
  isPublic: boolean;
  showcaseSwipeOptIn: boolean;
  profilSettingsHref: string;
  weeklyRank: VehicleWeeklyShowcaseRank | null;
  className?: string;
  /** Compact row for Builds entdecken; full block on Showcase settings. */
  variant?: "section" | "compact";
};

export function ShowcaseWeeklyPlacement({
  isPublic,
  showcaseSwipeOptIn,
  profilSettingsHref,
  weeklyRank,
  className,
  variant = "section",
}: ShowcaseWeeklyPlacementProps) {
  const eligible = isPublic && showcaseSwipeOptIn;

  if (!eligible) {
    if (variant === "compact") return null;
    return (
      <div className={cn("px-4 py-4", className)}>
        <h2 className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]">
          Wochenplatzierung
        </h2>
        <p className="mt-2 text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
          Aktiviere dein öffentliches Profil und „Builds entdecken“, um in der
          Wochenrangliste zu erscheinen.
        </p>
        <Link
          href={profilSettingsHref}
          className="mt-3 inline-flex text-[0.82rem] font-medium text-[color:var(--vd-text)] underline underline-offset-2"
        >
          Öffentliches Profil einrichten
        </Link>
      </div>
    );
  }

  if (!weeklyRank) {
    if (variant === "compact") {
      return (
        <div
          className={cn(
            "rounded-2xl border border-white/[0.08] bg-zinc-900/40 px-4 py-3",
            className,
          )}
        >
          <p className="text-[0.88rem] font-medium text-[color:var(--vd-text)]">
            Deine Platzierung
          </p>
          <p className="mt-1 text-[0.8rem] text-[color:var(--vd-muted)]">
            Noch keine Platzierung diese Woche — sammle Likes durch Swipes.
          </p>
        </div>
      );
    }
    return (
      <div className={cn("px-4 py-4", className)}>
        <h2 className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]">
          Wochenplatzierung
        </h2>
        <div
          className="mt-4 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/90 to-black px-5 py-6 text-center"
        >
          <p className="text-[0.92rem] font-medium text-zinc-200">
            Noch keine Platzierung diese Woche.
          </p>
          <p className="mt-2 text-[0.82rem] text-zinc-500">
            Likes aus „Builds entdecken“ zählen für die letzten 7 Tage.
          </p>
        </div>
      </div>
    );
  }

  const likeWord = weeklyRank.weeklyLikes === 1 ? "Like" : "Likes";
  const rankLabel = `Platz ${weeklyRank.rank} diese Woche`;
  const accent = isTopThreeRank(weeklyRank.rank)
    ? rankAccentBorder(weeklyRank.rank)
    : rankAccentBorder(99);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border bg-gradient-to-b px-4 py-3.5",
          accent,
          className,
        )}
        aria-label={rankLabel}
      >
        <div>
          <p className="text-[0.78rem] font-medium uppercase tracking-wide text-[color:var(--vd-muted)]">
            Deine Platzierung
          </p>
          <p className="mt-0.5 text-[1.35rem] font-semibold tabular-nums tracking-tight text-[color:var(--vd-text)]">
            #{weeklyRank.rank}
            {weeklyRank.rank === 1 ? (
              <span className="ml-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-amber-400/95">
                Build of the Week
              </span>
            ) : null}
          </p>
        </div>
        <p className="shrink-0 text-right font-mono text-[0.85rem] tabular-nums text-amber-400/90">
          {weeklyRank.weeklyLikes}
          <span className="block text-[0.68rem] font-sans font-normal text-zinc-500">
            {likeWord} · 7 Tage
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className={cn("px-4 py-4", className)}>
      <h2 className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]">
        Wochenplatzierung
      </h2>
      <p className="mt-1 text-[0.82rem] text-[color:var(--vd-muted)]">
        Top-Likes der letzten 7 Tage
      </p>
      <div
        className={cn(
          "mt-4 flex items-center justify-between gap-4 rounded-2xl border bg-gradient-to-b px-5 py-5",
          accent,
        )}
        aria-label={rankLabel}
      >
        <div>
          <p
            className="font-mono text-[2.4rem] font-bold tabular-nums leading-none tracking-tight text-[color:var(--vd-text)]"
          >
            #{weeklyRank.rank}
          </p>
          {weeklyRank.rank === 1 ? (
            <p className="mt-2 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-amber-400/95">
              Build of the Week
            </p>
          ) : null}
        </div>
        <p className="text-right font-mono text-[1.1rem] tabular-nums text-amber-400/90">
          {weeklyRank.weeklyLikes}
          <span className="block text-[0.75rem] font-sans font-normal text-zinc-500">
            {likeWord} · 7 Tage
          </span>
        </p>
      </div>
    </div>
  );
}
