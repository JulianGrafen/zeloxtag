"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ZeloxBrandFadeBanner } from "@/components/brand/zelox-brand-fade-banner";
import { AppShell } from "@/components/layout/app-shell";
import { DemoShareCardStudio } from "@/components/demo/demo-share-card-studio";
import { DemoViewSwitch, type DemoViewId } from "@/components/demo/demo-view-switch";
import { TagDashboardView } from "@/components/tags/tag-dashboard-view";
import { buildDemoTimelineEvents } from "@/lib/demo/demo-timeline-events";
import { DEMO_SHOWCASE_OWNER_NAME } from "@/lib/tags/demo-showcase";
import type { Document, Vehicle } from "@/types/database";

type DemoPageExperienceProps = {
  vehicle: Vehicle;
  documents: Document[];
  tagUuid: string;
};

export function DemoPageExperience({
  vehicle,
  documents,
  tagUuid,
}: DemoPageExperienceProps) {
  const [activeView, setActiveView] = useState<DemoViewId>("garage");
  const timelineEvents = useMemo(
    () => buildDemoTimelineEvents(documents),
    [documents],
  );

  const viewSwitch = (
    <DemoViewSwitch activeView={activeView} onChange={setActiveView} />
  );

  return (
    <AppShell showNavbar={false}>
      <div className="relative">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
          <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/95 px-3 py-2 shadow-[var(--vd-shadow-sm)] backdrop-blur-md">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.78rem] font-medium text-[color:var(--vd-text)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Anmelden
            </Link>
            <p className="truncate text-[0.72rem] font-medium text-[color:var(--vd-muted)]">
              Demo · BMW E36
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {process.env.NODE_ENV !== "production" ? (
                <Link
                  href="/dev/entdecken?native=1"
                  className="rounded-full border border-[color:var(--vd-border)] px-2.5 py-1.5 text-[0.68rem] font-semibold text-[color:var(--vd-text)]"
                >
                  Entdecken
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="pt-14">
          {activeView === "garage" ? (
            <TagDashboardView
              vehicle={vehicle}
              documents={documents}
              tagUuid={tagUuid}
              ownerName={DEMO_SHOWCASE_OWNER_NAME}
              canScan={false}
              demoMode
              timelineEvents={timelineEvents}
              defaultDashboardTab="timeline"
              belowBrandBanner={viewSwitch}
              productFeaturesBannerActive={false}
            />
          ) : (
            <div className="min-h-dvh bg-black pb-12 text-white">
              <div className="zelox-brand-banner-bleed zelox-brand-banner-bleed--tight pointer-events-none -mt-[max(1.25rem,env(safe-area-inset-top))]">
                <ZeloxBrandFadeBanner />
              </div>
              <div className="relative z-20 -mt-2 px-4 sm:px-5">{viewSwitch}</div>
              <div className="mx-auto max-w-lg px-4 pt-5 sm:px-5">
                <p className="text-[0.82rem] leading-snug text-zinc-400">
                  Share-Karte wie nach Entdecken-Swipe — Story, Post, Platzierung
                  und Showcase-Layout.
                </p>
                <DemoShareCardStudio className="mt-6" />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
