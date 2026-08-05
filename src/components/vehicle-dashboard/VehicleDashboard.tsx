"use client";

import { buildDefaultTiles } from "./buildDefaultTiles";
import { DashboardTile } from "./DashboardTile";
import type { VehicleDashboardProps } from "./types";
import { VehicleDashboardHeader } from "./VehicleDashboardHeader";

export function VehicleDashboard({
  data,
  onTileClick,
  onEditVehicleImage,
  className = "",
}: VehicleDashboardProps) {
  const tiles = data.tiles ?? buildDefaultTiles(data);

  return (
    <div
      className={`vd-root relative min-h-dvh overflow-x-hidden ${className}`.trim()}
    >
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <div data-tour="dashboard-header">
          <VehicleDashboardHeader
            ownerName={data.ownerName}
            vehicleModel={data.vehicleModel}
            vehicleImage={data.vehicleImage}
            vehicleImageAlt={data.vehicleImageAlt}
            statusLabel={data.statusLabel}
            onEditVehicleImage={onEditVehicleImage}
          />
        </div>

        <section
          aria-label="Fahrzeugmenü"
          className="vd-anim-header space-y-3"
          style={{ animationDelay: "0.12s" }}
          data-tour="tile-grid"
        >
          <h2 className="px-1 font-[family-name:var(--font-display)] text-[0.72rem] font-semibold tracking-[0.16em] text-[color:var(--vd-muted)] uppercase">
            Fahrzeugmenü
          </h2>

          <div className="vd-anim-stagger grid grid-cols-2 gap-3">
            {tiles.map((tile) => (
              <DashboardTile
                key={tile.id}
                tile={tile}
                onClick={onTileClick}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export type {
  DashboardTileConfig,
  DashboardTileId,
  VehicleDashboardData,
  VehicleDashboardProps,
} from "./types";
