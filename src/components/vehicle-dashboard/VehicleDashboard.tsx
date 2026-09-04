"use client";

import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { ScanContent } from "@/components/layout/scan-content";

import {
  buildDefaultTiles,
  isPrimaryScanSectionTile,
} from "./buildDefaultTiles";
import { DashboardTile } from "./DashboardTile";
import type { VehicleDashboardProps } from "./types";
import { VehicleDashboardHeader } from "./VehicleDashboardHeader";

export function VehicleDashboard({
  data,
  onTileClick,
  onEditVehicleImage,
  onSilhouetteProxyLoad,
  banner,
  scanSlot,
  className = "",
}: VehicleDashboardProps) {
  const tiles = data.tiles ?? buildDefaultTiles(data);
  const primaryTiles = tiles.filter((tile) => isPrimaryScanSectionTile(tile.id));
  const secondaryTiles = tiles.filter((tile) => !isPrimaryScanSectionTile(tile.id));

  return (
    <ScanContent className={className}>
      <div data-tour="dashboard-header">
        <VehicleDashboardHeader
          ownerName={data.ownerName}
          vehicleModel={data.vehicleModel}
          vehicleImage={data.vehicleImage}
          vehicleImageFallback={data.vehicleImageFallback}
          vehicleImagePreviewFallback={data.vehicleImagePreviewFallback}
          vehicleImageAlt={data.vehicleImageAlt}
          vehicleImageFrameless={data.vehicleImageFrameless}
          statusLabel={data.statusLabel}
          onEditVehicleImage={onEditVehicleImage}
          onSilhouetteProxyLoad={onSilhouetteProxyLoad}
        />
      </div>

      {banner}

      <section
        aria-label="Fahrzeugmenü"
        className="vd-anim-header space-y-3"
        style={{ animationDelay: "0.12s" }}
        data-tour="tile-grid"
      >
        <h2 className="claim-kicker px-1">Fahrzeugmenü</h2>

        {primaryTiles.length > 0 ? (
          <div className="vd-anim-stagger grid grid-cols-2 gap-3">
            {primaryTiles.map((tile) => (
              <DashboardTile
                key={tile.id}
                tile={tile}
                onClick={onTileClick}
              />
            ))}
          </div>
        ) : null}

        {scanSlot ? <div className="px-1">{scanSlot}</div> : null}

        {secondaryTiles.length > 0 ? (
          <div className="vd-anim-stagger grid grid-cols-2 gap-3">
            {secondaryTiles.map((tile) => (
              <DashboardTile
                key={tile.id}
                tile={tile}
                onClick={onTileClick}
              />
            ))}
          </div>
        ) : null}
      </section>

      <VehicleDataDisclaimer className="vd-anim-header" />
    </ScanContent>
  );
}

export type {
  DashboardTileConfig,
  DashboardTileId,
  VehicleDashboardData,
  VehicleDashboardProps,
} from "./types";
