"use client";

import { useMemo } from "react";

import { ZeloxBrandFadeBanner } from "@/components/brand/zelox-brand-fade-banner";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { ScanContent } from "@/components/layout/scan-content";
import { cn } from "@/lib/utils";

import { buildDefaultTiles } from "./buildDefaultTiles";
import { DashboardQuickAccessBar } from "./dashboard-quick-access-bar";
import { dashboardMenuKickerClassName } from "./dashboard-menu-styles";
import { partitionDashboardTiles } from "./dashboard-tile-layout";
import { DashboardTileGrid } from "./DashboardTileGrid";
import type { VehicleDashboardProps } from "./types";
import { VehicleDashboardHeader } from "./VehicleDashboardHeader";

export function VehicleDashboard({
  data,
  quickAccessItems,
  onTileClick,
  onSilhouetteProxyLoad,
  banner,
  extraTiles,
  className = "",
}: VehicleDashboardProps) {
  const tiles = data.tiles ?? buildDefaultTiles(data);
  const { primary, secondary } = useMemo(
    () => partitionDashboardTiles(tiles),
    [tiles],
  );

  return (
    <ScanContent className={cn("gap-0 px-0 pt-0", className)}>
      <div className="zelox-brand-banner-bleed zelox-brand-banner-bleed--tight pointer-events-none -mt-[max(1.25rem,env(safe-area-inset-top))]">
        <ZeloxBrandFadeBanner />
      </div>

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
        </div>

        {banner}

        <section
          aria-label="Fahrzeugmenü"
          className="vd-anim-header flex min-h-0 flex-col gap-2 [animation-delay:0.12s]"
          data-tour="tile-grid"
        >
          <h2 className={cn(dashboardMenuKickerClassName, "px-0.5")}>
            Fahrzeugmenü
          </h2>

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
