/** Shared black/white styling for the public showcase. */
export const showroom = {
  page: "min-h-dvh bg-black text-white",
  /** Tall hero — title sits on the photo with a bottom fade. */
  heroMinHeight: "min-h-[min(88dvh,880px)]",
  /** Full-bleed hero photo; title sits on bottom fade. */
  heroSwipeBand: "inset-0",
  /** Shared black fades — public showcase hero + in-app swipe cards. */
  heroBackdropTopFade:
    "pointer-events-none absolute inset-x-0 top-0 z-[2] h-[32%] bg-gradient-to-b from-black/70 to-transparent",
  heroBackdropBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[min(62%,28rem)] bg-gradient-to-t from-black from-0% via-black/85 via-[42%] to-transparent",
  heroCopyBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[min(50%,22rem)] bg-gradient-to-t from-black via-black/75 to-transparent",
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
  /** Leading icon slot — aligned with garage IOSListItem rows. */
  listLeadingIcon:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white",
  listTitle: "block text-[0.94rem] font-medium leading-snug text-white",
  listSubtitle: "mt-0.5 block text-[0.82rem] leading-snug text-white/50",
  kicker:
    "text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/45",
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
