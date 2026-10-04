import { cn } from "@/lib/utils";

/** Material card — dark automotive (use inside .dark or explicit zinc contexts). */
export const automotiveCardClassName = cn(
  "relative overflow-hidden rounded-2xl border border-white/5 border-t-white/10",
  "bg-gradient-to-b from-zinc-800/40 to-zinc-900/80 backdrop-blur-md",
  "shadow-[0_12px_40px_rgba(0,0,0,0.28)]",
);

/** Feature page hero panel — theme-aware (vd-surface in light, material in dark). */
export const automotiveFeaturePanelClassName = cn(
  "zt-feature-panel p-5 shadow-[var(--vd-shadow)]",
);

export const automotiveFeaturePanelLgClassName = cn(
  automotiveFeaturePanelClassName,
  "sm:p-6",
);

export const automotiveCardInteractiveClassName = cn(
  automotiveCardClassName,
  "transition-[box-shadow,background-color,border-color,transform] duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
  "hover:border-white/10 hover:from-zinc-800/55 hover:to-zinc-900/90 hover:shadow-[0_0_28px_rgba(255,255,255,0.07)]",
  "group-data-[pressed=true]:scale-[0.98] group-data-[pressed=true]:brightness-105",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
);

export const automotiveMenuTileClassName = cn(
  "group relative z-10 flex min-h-[8.5rem] w-full cursor-pointer flex-col justify-between overflow-hidden p-4 text-left select-none",
  automotiveCardInteractiveClassName,
);

export const automotiveCardTitleClassName =
  "font-medium text-[0.95rem] leading-snug tracking-tight text-zinc-100";

export const automotiveDisplayTitleClassName =
  "font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-zinc-100";

export const automotiveMetaClassName = cn(
  "font-mono text-[0.68rem] font-normal leading-relaxed tracking-wider text-zinc-400 uppercase tabular-nums",
);

export const automotiveKickerClassName = cn(
  "font-mono text-[0.65rem] font-medium uppercase tracking-[0.22em] text-zinc-500",
);

export const automotiveIconWrapClassName = cn(
  "inline-flex h-11 w-11 items-center justify-center rounded-2xl",
  "bg-gradient-to-b from-zinc-700/50 to-zinc-900/80 text-zinc-100",
  "ring-1 ring-inset ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:scale-90",
);

/** Dashboard-only vehicle hero shell. */
export const automotiveHeroShellClassName = cn(
  "relative isolate overflow-hidden rounded-[1.35rem]",
  "border border-white/5 border-t-white/10",
  "bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 shadow-[0_20px_50px_rgba(0,0,0,0.45)]",
);

export const automotivePageHeaderBlockClassName = "space-y-1.5";

export const automotiveBodyMutedClassName =
  "text-[0.88rem] leading-relaxed text-zinc-400";

export const automotiveMetricHighlightClassName =
  "text-[1.05rem] font-semibold tracking-[-0.02em] text-zinc-100 tabular-nums";

export const automotiveSecondaryButtonClassName = cn(
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[0.88rem] font-semibold",
  "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]",
  "dark:border-white/10 dark:bg-zinc-800/40 dark:text-zinc-100 dark:backdrop-blur-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
);

export const automotiveFilterChipActiveClassName = cn(
  "shrink-0 rounded-full px-3.5 py-2 text-[0.78rem] font-semibold",
  "bg-neutral-900 text-white",
  "dark:border dark:border-white/50 dark:bg-gradient-to-b dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-950 dark:shadow-lg dark:shadow-white/10",
);

export const automotiveFilterChipInactiveClassName = cn(
  "shrink-0 rounded-full px-3.5 py-2 text-[0.78rem] font-semibold",
  "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-muted)]",
  "dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-400",
);

export const automotiveSpecCellClassName = cn(
  "rounded-xl p-3",
  "bg-[color:var(--vd-surface-elevated)]",
  "dark:bg-zinc-800/40 dark:ring-1 dark:ring-inset dark:ring-white/10",
);

export const automotiveSpecLabelClassName = cn(
  automotiveMetaClassName,
  "normal-case tracking-[0.12em]",
);

export const automotiveSpecValueClassName =
  "mt-0.5 font-medium tracking-tight text-zinc-100 tabular-nums";

export const automotiveBackPillClassName = cn(
  "inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-[0.78rem] font-medium",
  "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]",
  "dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100 dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] dark:backdrop-blur-md",
  "transition-colors hover:border-white/15 dark:hover:bg-zinc-800/70",
);

export const automotivePrimaryCtaClassName = cn(
  "zt-cta-primary no-underline inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl",
  "border border-white/50 bg-gradient-to-b from-zinc-100 to-zinc-300 font-semibold text-zinc-950",
  "shadow-lg shadow-white/10 hover:from-white hover:to-zinc-200",
);

export const automotivePrimaryCtaLockedClassName = cn(
  "zt-cta-primary--locked inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl",
  "border border-white/10 bg-gradient-to-b from-zinc-800/60 to-zinc-900/90 font-semibold text-zinc-400 shadow-none",
);

export const automotiveBottomBarShellClassName = cn(
  "pointer-events-auto relative border-t border-white/10",
  "bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-zinc-950/80",
  "px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md sm:px-5",
);

/** @deprecated Use automotiveMenuTileClassName */
export const dashboardMenuCardClassName = automotiveMenuTileClassName;

/** @deprecated Use automotiveCardTitleClassName */
export const dashboardMenuCardTitleClassName = automotiveCardTitleClassName;

/** @deprecated Use automotiveMetaClassName */
export const dashboardMenuCardMetaClassName = automotiveMetaClassName;

/** @deprecated Use automotiveIconWrapClassName */
export const dashboardMenuIconWrapClassName = automotiveIconWrapClassName;

/** @deprecated Use automotiveHeroShellClassName */
export const dashboardHeroShellClassName = automotiveHeroShellClassName;

/** @deprecated Use automotivePrimaryCtaClassName */
export const dashboardScanCtaClassName = automotivePrimaryCtaClassName;

/** @deprecated Use automotivePrimaryCtaLockedClassName */
export const dashboardScanCtaLockedClassName = automotivePrimaryCtaLockedClassName;
