import { cn } from "@/lib/utils";

/** Full-page wrapper for entdecken / public swipe (covers vd-atmosphere). */
export const discoverPageRootClassName = cn(
  "dark relative flex w-full flex-col bg-black text-white",
);

/** Full-route entdecken (not embedded in demo dashboard tab). */
export const discoverFullPageRootClassName = cn(
  discoverPageRootClassName,
  "min-h-dvh",
);

export const discoverEmptyPanelClassName = cn(
  "rounded-2xl border border-white/10 bg-zinc-900/45 px-5 py-10 text-center",
);

export const discoverEmptyTitleClassName =
  "text-[0.95rem] font-medium text-zinc-100";

export const discoverEmptyBodyClassName =
  "mt-2 text-[0.82rem] leading-relaxed text-zinc-400";

export const discoverEmptyActionClassName = cn(
  "mt-5 text-[0.85rem] font-semibold text-white/90 transition active:opacity-70",
);

export const discoverDeckSkeletonClassName = cn(
  "mx-auto aspect-[9/16] w-full max-h-[min(72vh,640px)] max-w-full animate-pulse rounded-3xl bg-zinc-900 ring-1 ring-white/10",
);

export const discoverDeckFrameClassName = cn(
  "relative mx-auto aspect-[9/16] w-full max-h-[min(72vh,640px)] max-w-full",
);
