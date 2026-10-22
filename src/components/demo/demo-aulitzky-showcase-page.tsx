"use client";

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
            <div className="mx-auto w-full max-w-lg text-center">
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
