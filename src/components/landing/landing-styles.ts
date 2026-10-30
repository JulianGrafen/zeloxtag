export const landingSurface = {
  page: "relative min-h-dvh overflow-x-clip bg-[#07080C] font-sans text-[#E2E8F0] antialiased",
  section: "relative scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28",
  sectionMuted: "bg-[#0F1117]",
  container: "mx-auto w-full max-w-6xl",
  kicker: "font-mono text-xs uppercase tracking-widest text-[#38BDF8]/85",
  h1: "text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[4.15rem] lg:leading-[1.04]",
  h2: "text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight",
  lead: "text-pretty text-base leading-relaxed text-white/62 sm:text-lg",
  glass:
    "rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl",
  primaryCta:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-[#07080C] transition-colors hover:bg-[#E2E8F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]/80",
  glassCta:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]/80",
  quietCta:
    "inline-flex min-h-11 items-center text-sm font-medium text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]/80",
} as const;
