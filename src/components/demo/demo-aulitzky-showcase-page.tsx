"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ZeloxBrandWordmark } from "@/components/brand/zelox-brand-wordmark";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShowcaseView } from "@/components/public-showcase/PublicShowcaseView";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

type DemoAulitzkyShowcasePageProps = {
  showcasePayload: PublicShowcasePayload;
};

/** Same showcase chrome as `/demo` (wordmark header + embedded hero). */
export function DemoAulitzkyShowcasePage({
  showcasePayload,
}: DemoAulitzkyShowcasePageProps) {
  return (
    <AppShell showNavbar={false}>
      <div className="relative min-h-dvh bg-[color:var(--vd-bg)]">
        <header className="sticky top-0 z-50 border-b border-[color:var(--vd-border)] bg-black pb-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          <div className="px-4 pt-[max(0.65rem,env(safe-area-inset-top))] sm:px-5">
            <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.78rem] font-medium text-white/90"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Anmelden
              </Link>
              <p className="truncate text-[0.72rem] font-medium text-zinc-400">
                Partner Demo · M4 G82
              </p>
              <span className="w-[4.5rem] shrink-0" aria-hidden />
            </div>

            <div className="mx-auto mt-3 w-full max-w-lg text-center">
              <ZeloxBrandWordmark size="banner" className="text-white" />
            </div>
          </div>
        </header>

        <PublicShowcaseView
          data={showcasePayload}
          hideBrandBanner
          revealShowroomStatsOnMount
        />
      </div>
    </AppShell>
  );
}
