"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ZeloxBrandWordmark } from "@/components/brand/zelox-brand-wordmark";
import { AppShell } from "@/components/layout/app-shell";
import { DemoViewSwitch, type DemoViewId } from "@/components/demo/demo-view-switch";
import { PublicShowcaseView } from "@/components/public-showcase/PublicShowcaseView";
import { TagDashboardView } from "@/components/tags/tag-dashboard-view";
import { buildDemoTimelineEvents } from "@/lib/demo/demo-timeline-events";
import { getDemoOperatingCostsForVehicle } from "@/lib/demo/mock-operating-costs";
import { buildOperatingCostDashboardHint } from "@/lib/vehicles/operating-costs/summary";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import { DEMO_SHOWCASE_OWNER_NAME } from "@/lib/tags/demo-showcase";
import type { Document, Vehicle } from "@/types/database";

type DemoPageExperienceProps = {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
  showcasePayload: PublicShowcasePayload;
};

export function DemoPageExperience({
  vehicle,
  documents,
  tagUuid,
  showcasePayload,
}: DemoPageExperienceProps) {
  const [activeView, setActiveView] = useState<DemoViewId>("garage");
  const timelineEvents = useMemo(
    () => buildDemoTimelineEvents(documents),
    [documents],
  );
  const operatingCostHint = useMemo(
    () =>
      buildOperatingCostDashboardHint(
        getDemoOperatingCostsForVehicle(vehicle.id),
      ),
    [vehicle.id],
  );

  useLayoutEffect(() => {
    if (activeView !== "showcase") return;
    window.scrollTo(0, 0);
  }, [activeView]);

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
                Demo · BMW E36
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                {process.env.NODE_ENV !== "production" ? (
                  <Link
                    href="/dev/entdecken?native=1"
                    className="rounded-full border border-white/15 px-2.5 py-1.5 text-[0.68rem] font-semibold text-white"
                  >
                    Entdecken
                  </Link>
                ) : (
                  <span className="w-[4.5rem]" aria-hidden />
                )}
              </div>
            </div>

            <div className="mx-auto mt-3 w-full max-w-lg text-center">
              <ZeloxBrandWordmark size="banner" className="text-white" />
            </div>

            <div className="mx-auto mt-3 w-full max-w-lg">
              <DemoViewSwitch
                activeView={activeView}
                onChange={setActiveView}
              />
            </div>
          </div>
        </header>

        {activeView === "garage" ? (
          <TagDashboardView
            vehicle={vehicle}
            documents={documents}
            tagUuid={tagUuid}
            ownerName={DEMO_SHOWCASE_OWNER_NAME}
            canScan={false}
            demoMode
            timelineEvents={timelineEvents}
            defaultDashboardTab="overview"
            hideBrandBanner
            productFeaturesBannerActive={false}
            operatingCostHint={operatingCostHint}
          />
        ) : (
          <PublicShowcaseView
            data={showcasePayload}
            hideBrandBanner
            revealShowroomStatsOnMount
          />
        )}
      </div>
    </AppShell>
  );
}
