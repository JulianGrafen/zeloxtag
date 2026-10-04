/** Shared black/white styling for the public showcase. */
export const showroom = {
  page: "min-h-dvh bg-black text-white",
  /** Tall hero so charts/photos breathe before the spec stack. */
  heroMinHeight: "min-h-[min(92dvh,920px)]",
  /**
   * Horizontal swipe capture: most of the hero image, excluding the lower
   * title / dots strip so vertical page scroll still works there.
   */
  heroSwipeBand: "bottom-[34%] min-h-[min(52dvh,520px)]",
  content: "relative z-10 bg-black pt-2",
  panel:
    "overflow-hidden rounded-2xl border border-white/5 border-t-white/10 bg-gradient-to-b from-zinc-800/40 to-zinc-900/80 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-md",
  /** Legacy / gallery thumbs — light inset, no heavy shadow. */
  specSurface:
    "overflow-hidden rounded-2xl border border-white/5 border-t-white/10 bg-gradient-to-b from-zinc-800/35 to-zinc-900/75 backdrop-blur-md",
  panelFlat:
    "overflow-hidden rounded-2xl border border-white/10 border-t-white/15 bg-gradient-to-b from-zinc-800/30 to-zinc-900/70",
  group: "overflow-hidden rounded-2xl bg-white/[0.07]",
  groupAccent:
    "relative before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
  groupDivider: "border-white/10",
  sectionLabel:
    "mb-2 px-1 text-[0.81rem] font-medium text-white/45",
  rowLabel: "text-[0.94rem] text-white/55",
  rowValue:
    "text-right text-[0.94rem] font-medium tabular-nums text-white",
  rowValueEmphasis:
    "text-right text-[1.02rem] font-semibold tracking-tight tabular-nums text-white",
  disclosureRow:
    "flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5",
  kicker:
    "font-mono text-[0.65rem] font-medium uppercase tracking-[0.22em] text-zinc-500",
  sectionTitle:
    "text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/45",
  label: "text-[0.78rem] text-white/45",
  body: "text-[0.88rem] leading-relaxed text-white/80",
  value: "text-[0.88rem] font-medium text-white",
  icon: "text-white/55",
  pill:
    "inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-transparent px-4 text-[0.82rem] font-semibold text-white",
  cta: "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-[0.88rem] font-semibold text-black",
  footer:
    "text-center text-[0.68rem] uppercase tracking-[0.18em] text-white/35",
  brandWordmark:
    "font-[family-name:var(--font-bebas-neue)] text-[1.65rem] font-normal leading-none tracking-[0.34em] text-white sm:text-[1.85rem]",
} as const;
