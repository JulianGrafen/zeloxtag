"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { isTopThreeRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { cn } from "@/lib/utils";

function rankAccentBorder(rank: number): string {
  if (rank === 1) return "border-amber-400/35 from-amber-950/40 to-black";
  if (rank === 2) return "border-zinc-300/25 from-zinc-800/50 to-black";
  if (rank === 3) return "border-orange-700/35 from-orange-950/30 to-black";
  return "border-white/[0.08] from-zinc-900 to-black";
}

function compactRankBadgeClass(rank: number): string {
  const base =
    "flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border bg-black/20 font-mono text-[1.05rem] font-bold tabular-nums tracking-tight text-[color:var(--vd-text)]";
  if (rank === 1) {
    return cn(base, "border-amber-400/35 text-amber-100");
  }
  if (rank === 2) {
    return cn(base, "border-zinc-300/25 text-zinc-100");
  }
  if (rank === 3) {
    return cn(base, "border-orange-700/35 text-orange-100/95");
  }
  return cn(base, "border-white/[0.08]");
}

function compactPanelRing(rank: number): string {
  if (rank === 1) return "ring-1 ring-amber-400/20";
  if (rank === 2) return "ring-1 ring-zinc-400/15";
  if (rank === 3) return "ring-1 ring-orange-600/20";
  return "";
}

type ShowcaseWeeklyPlacementProps = {
  isPublic: boolean;
  showcaseSwipeOptIn: boolean;
  profilSettingsHref: string;
  weeklyRank: VehicleWeeklyShowcaseRank | null;
  className?: string;
  /** Compact row for Builds entdecken; full block on Showcase settings. */
  variant?: "section" | "compact" | "inset";
  /** Rank line already shown in page header — hide duplicate badge row. */
  rankShownInHeader?: boolean;
};

export function ShowcaseWeeklyPlacement({
  isPublic,
  showcaseSwipeOptIn,
  profilSettingsHref,
  weeklyRank,
  className,
  variant = "section",
  rankShownInHeader = false,
}: ShowcaseWeeklyPlacementProps) {
  const eligible = isPublic && showcaseSwipeOptIn;

  if (!eligible) {
    if (variant === "compact") return null;
    if (variant === "inset") {
      return (
        <div className={cn("px-4 py-3", className)}>
          <p className="text-[13px] leading-snug text-zinc-400">
            Aktiviere „Im Build-Swipe zeigen“ unter{" "}
            <Link
              href={profilSettingsHref}
              className="text-white underline underline-offset-2"
            >
              Öffentliches Profil
            </Link>
            .
          </p>
        </div>
      );
    }
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
        <div className={cn("px-3.5 py-3", className)}>
          <p className="text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            Noch keine Platzierung diese Woche — sammle Likes durch Swipes.
          </p>
        </div>
      );
    }
    if (variant === "inset") {
      return (
        <div className={cn("px-4 py-3", className)}>
          <div
            className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/90 to-black px-4 py-5 text-center"
          >
            <p className="text-[15px] font-medium text-zinc-200">
              Noch keine Platzierung diese Woche.
            </p>
            <p className="mt-2 text-[13px] text-zinc-500">
              Likes aus „Builds entdecken“ zählen für die letzten 7 Tage.
            </p>
          </div>
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
    const subtitle =
      weeklyRank.rank === 1
        ? "Build of the Week"
        : "In der Wochenrangliste";

    if (rankShownInHeader) {
      return (
        <div
          className={cn("px-3.5 py-3", className)}
          aria-label={rankLabel}
        >
          <p className="text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
            {subtitle}
            <span className="text-[color:var(--vd-border)]"> · </span>
            <span
              className="inline-flex items-center gap-1 font-mono tabular-nums text-[color:var(--vd-text)]"
              aria-label={`${weeklyRank.weeklyLikes} ${likeWord}`}
            >
              <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {weeklyRank.weeklyLikes} {likeWord} in 7 Tagen
            </span>
          </p>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "px-4 py-3.5",
          !rankShownInHeader && "zt-feature-panel",
          !rankShownInHeader && compactPanelRing(weeklyRank.rank),
          className,
        )}
        aria-label={rankLabel}
      >
        <div className="flex items-center gap-3">
          <div className={compactRankBadgeClass(weeklyRank.rank)}>
            #{weeklyRank.rank}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.88rem] font-semibold text-[color:var(--vd-text)]">
              Deine Platzierung
            </p>
            <p className="mt-0.5 text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
              {subtitle}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className="flex items-center justify-end gap-1 font-mono text-[0.92rem] font-semibold tabular-nums tracking-tight text-amber-400/95"
              aria-label={`${weeklyRank.weeklyLikes} ${likeWord}`}
            >
              <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {weeklyRank.weeklyLikes}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "inset") {
    return (
      <div className={cn("px-4 py-3", className)} aria-label={rankLabel}>
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-xl border bg-gradient-to-b px-4 py-4",
            accent,
          )}
        >
          <div>
            <p
              className="font-mono text-[2rem] font-bold tabular-nums leading-none tracking-tight text-white"
            >
              #{weeklyRank.rank}
            </p>
            {weeklyRank.rank === 1 ? (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-400/95">
                Build of the Week
              </p>
            ) : null}
          </div>
          <p className="text-right font-mono text-[1rem] tabular-nums text-amber-400/90">
            {weeklyRank.weeklyLikes}
            <span className="block text-[12px] font-sans font-normal text-zinc-500">
              {likeWord} · 7 Tage
            </span>
          </p>
        </div>
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
