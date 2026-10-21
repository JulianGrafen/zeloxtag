import { isTopThreeRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { cn } from "@/lib/utils";

export function discoverRankBadgeClass(rank: number): string {
  const base =
    "flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border bg-black/30 font-mono text-[1.15rem] font-bold tabular-nums tracking-tight text-white shadow-inner";
  if (rank === 1) {
    return cn(base, "border-amber-400/45 text-amber-100 shadow-amber-500/10");
  }
  if (rank === 2) {
    return cn(base, "border-zinc-300/30 text-zinc-100");
  }
  if (rank === 3) {
    return cn(base, "border-orange-600/40 text-orange-100/95");
  }
  return cn(base, "border-white/10 text-zinc-100");
}

export function discoverRankPanelRingClass(rank: number): string {
  if (rank === 1) return "ring-1 ring-amber-400/25";
  if (rank === 2) return "ring-1 ring-zinc-400/20";
  if (rank === 3) return "ring-1 ring-orange-600/25";
  return "ring-1 ring-white/10";
}

export function discoverRankAccentGradient(rank: number): string {
  if (rank === 1) {
    return "border-amber-400/30 from-amber-950/50 via-zinc-950/90 to-black";
  }
  if (rank === 2) {
    return "border-zinc-400/20 from-zinc-800/60 via-zinc-950/90 to-black";
  }
  if (rank === 3) {
    return "border-orange-700/35 from-orange-950/40 via-zinc-950/90 to-black";
  }
  return "border-white/10 from-zinc-900/90 to-black";
}

export function discoverRankListAccentClass(rank: number): string {
  if (rank === 1) return "text-amber-400";
  if (rank === 2) return "text-zinc-300";
  if (rank === 3) return "text-orange-400";
  return "text-zinc-500";
}

export function discoverRankIsTopThree(rank: number): boolean {
  return isTopThreeRank(rank);
}

/** Sticky ego pill / placement bar — stronger “your rank” emphasis. */
export function discoverOwnPlacementShellClass(rank: number): string {
  const base =
    "shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)]";
  if (rank === 1) {
    return cn(
      base,
      "ring-2 ring-amber-400/50 shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_32px_rgba(251,191,36,0.22)]",
    );
  }
  if (rank === 2) {
    return cn(base, "ring-2 ring-zinc-200/35");
  }
  if (rank === 3) {
    return cn(base, "ring-2 ring-orange-500/40");
  }
  return cn(
    base,
    "ring-2 ring-sky-400/35 shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_28px_rgba(56,189,248,0.12)]",
  );
}

export function discoverOwnPlacementBadgeGlowClass(rank: number): string {
  if (rank === 1) return "shadow-[0_0_20px_rgba(251,191,36,0.35)]";
  if (rank === 2) return "shadow-[0_0_16px_rgba(228,228,231,0.2)]";
  if (rank === 3) return "shadow-[0_0_18px_rgba(234,88,12,0.28)]";
  return "shadow-[0_0_18px_rgba(56,189,248,0.22)]";
}
