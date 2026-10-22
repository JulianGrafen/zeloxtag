"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PublicShowcaseView } from "@/components/public-showcase/PublicShowcaseView";
import { ShowcaseStickyWordmarkChrome } from "@/components/public-showcase/showcase-sticky-wordmark-chrome";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

type DemoPartnerShowcasePageProps = {
  showcasePayload: PublicShowcasePayload;
};

/** Partner B2B demo: sticky wordmark chrome + public spec sheet. */
export function DemoPartnerShowcasePage({
  showcasePayload,
}: DemoPartnerShowcasePageProps) {
  return (
    <AppShell showNavbar={false}>
      <div className="relative min-h-dvh bg-[color:var(--vd-bg)]">
        <ShowcaseStickyWordmarkChrome />

        <PublicShowcaseView
          data={showcasePayload}
          hideBrandBanner
          revealShowroomStatsOnMount
        />
      </div>
    </AppShell>
  );
}
