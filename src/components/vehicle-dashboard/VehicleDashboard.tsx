"use client";

import { useMemo, useState } from "react";

import { ZeloxBrandFadeBanner } from "@/components/brand/zelox-brand-fade-banner";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { ScanContent } from "@/components/layout/scan-content";
import { cn } from "@/lib/utils";

import { buildDefaultTiles } from "./buildDefaultTiles";
import { DashboardQuickAccessBar } from "./dashboard-quick-access-bar";
import {
  DashboardTabSwitch,
  type DashboardTabId,
} from "./dashboard-tab-switch";
import { dashboardMenuKickerClassName } from "./dashboard-menu-styles";
import { partitionDashboardTiles } from "./dashboard-tile-layout";
import { DashboardTileGrid } from "./DashboardTileGrid";
import { DashboardTabPanelTransition } from "./dashboard-tab-panel-transition";
import { VehicleDashboardTimeline } from "./VehicleTimeline";
import type { VehicleDashboardProps } from "./types";
import { VehicleDashboardHeader } from "./VehicleDashboardHeader";

export function VehicleDashboard({
  data,
  quickAccessItems,
  timelineEvents = [],
  documents = [],
  resolveDocumentHref,
  chronikEmptyCtaHref = "#",
  canAddChronikEntry = true,
  defaultTab = "overview",
  onTileClick,
  onSilhouetteProxyLoad,
  banner,
  extraTiles,
  belowBrandBanner,
  className = "",
}: VehicleDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>(defaultTab);
  const tiles = data.tiles ?? buildDefaultTiles(data);
  const { primary, secondary } = useMemo(
    () => partitionDashboardTiles(tiles),
    [tiles],
  );
  const showChronik =
    Boolean(resolveDocumentHref) && timelineEvents !== undefined;

  return (
    <ScanContent className={cn("min-w-0 gap-0 overflow-x-clip px-0 pt-0", className)}>
      <div className="zelox-brand-banner-bleed zelox-brand-banner-bleed--tight pointer-events-none -mt-[max(1.25rem,env(safe-area-inset-top))]">
        <ZeloxBrandFadeBanner />
      </div>

      {belowBrandBanner ? (
        <div className="relative z-20 -mt-2 px-4 sm:px-5">{belowBrandBanner}</div>
      ) : null}

      <div className="relative z-10 -mt-1 flex min-h-0 flex-1 flex-col gap-3 px-4 sm:px-5">
        <div className="flex shrink-0 flex-col gap-2.5">
          <VehicleDashboardHeader
            ownerName={data.ownerName}
            vehicleModel={data.vehicleModel}
            vehicleImage={data.vehicleImage}
            vehicleImageFallback={data.vehicleImageFallback}
            vehicleImagePreviewFallback={data.vehicleImagePreviewFallback}
            vehicleImageAlt={data.vehicleImageAlt}
            vehicleImageFrameless={data.vehicleImageFrameless}
            onSilhouetteProxyLoad={onSilhouetteProxyLoad}
          />

          {quickAccessItems && quickAccessItems.length > 0 ? (
            <DashboardQuickAccessBar items={quickAccessItems} />
          ) : null}

          {showChronik ? (
            <DashboardTabSwitch
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          ) : null}
        </div>

        {banner}

        {showChronik ? (
          <DashboardTabPanelTransition
            activeTab={activeTab}
            overview={
              <section
                id="dashboard-panel-overview"
                role="tabpanel"
                aria-labelledby="dashboard-tab-overview"
                aria-label="Fahrzeugmenü"
                className="vd-anim-header flex min-h-0 flex-col gap-2 [animation-delay:0.12s]"
                data-tour="tile-grid"
              >
                {primary.length > 0 ? (
                  <DashboardTileGrid
                    tiles={primary}
                    density="compact"
                    onTileClick={onTileClick}
                    className="shrink-0"
                  />
                ) : null}

                {secondary.length > 0 ? (
                  <div className="flex flex-col gap-2 pt-0.5">
                    <h3
                      className={cn(
                        dashboardMenuKickerClassName,
                        "px-0.5 text-[0.62rem] tracking-[0.2em] text-zinc-600",
                      )}
                    >
                      Weitere
                    </h3>
                    <DashboardTileGrid
                      tiles={secondary}
                      density="comfortable"
                      onTileClick={onTileClick}
                    />
                    {extraTiles}
                  </div>
                ) : (
                  extraTiles
                )}
              </section>
            }
            timeline={
              <section
                id="dashboard-panel-timeline"
                role="tabpanel"
                aria-labelledby="dashboard-tab-timeline"
                className="vd-anim-header flex min-h-0 flex-col gap-2 pb-2 [animation-delay:0.12s]"
              >
                <VehicleDashboardTimeline
                  events={timelineEvents}
                  documents={documents}
                  documentHref={resolveDocumentHref!}
                  emptyCtaHref={chronikEmptyCtaHref}
                  canAddEntry={canAddChronikEntry}
                />
              </section>
            }
          />
        ) : (
          <section
            id="dashboard-panel-overview"
            role="tabpanel"
            aria-labelledby="dashboard-tab-overview"
            aria-label="Fahrzeugmenü"
            className="vd-anim-header flex min-h-0 flex-col gap-2 [animation-delay:0.12s]"
            data-tour="tile-grid"
          >
            {primary.length > 0 ? (
              <DashboardTileGrid
                tiles={primary}
                density="compact"
                onTileClick={onTileClick}
                className="shrink-0"
              />
            ) : null}

            {secondary.length > 0 ? (
              <div className="flex flex-col gap-2 pt-0.5">
                <h3
                  className={cn(
                    dashboardMenuKickerClassName,
                    "px-0.5 text-[0.62rem] tracking-[0.2em] text-zinc-600",
                  )}
                >
                  Weitere
                </h3>
                <DashboardTileGrid
                  tiles={secondary}
                  density="comfortable"
                  onTileClick={onTileClick}
                />
                {extraTiles}
              </div>
            ) : (
              extraTiles
            )}
          </section>
        )}

        <VehicleDataDisclaimer className="vd-anim-header shrink-0" />
      </div>
    </ScanContent>
  );
}

export type {
  DashboardTileConfig,
  DashboardTileId,
  VehicleDashboardData,
  VehicleDashboardProps,
} from "./types";
