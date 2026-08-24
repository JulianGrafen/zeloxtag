/** Shared black/white styling for the public showcase. */
export const showroom = {
  page: "min-h-dvh bg-black text-white",
  panel:
    "overflow-hidden rounded-[1.25rem] border border-white/15 bg-white/[0.03]",
  panelFlat: "rounded-[1.25rem] border border-white/15 bg-white/[0.03]",
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
} as const;
