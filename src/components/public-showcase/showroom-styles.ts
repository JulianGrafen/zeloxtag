/** Shared black/white styling for the public showcase. */
export const showroom = {
  page: "min-h-dvh bg-black text-white",
  /** Tall hero so charts/photos breathe before the spec stack. */
  heroMinHeight: "min-h-[min(92dvh,920px)]",
  /** Horizontal swipe only in this band — keeps vertical page scroll below. */
  heroSwipeBand:
    "h-[min(46dvh,420px)] max-h-[42%] min-h-[200px]",
  content: "relative z-10 bg-black pt-2",
  panel:
    "overflow-hidden rounded-[1.25rem] border border-white/15 bg-white/[0.03]",
  /** Legacy / gallery thumbs — light inset, no heavy shadow. */
  specSurface: "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]",
  panelFlat:
    "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]",
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
    "text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-white/50",
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
