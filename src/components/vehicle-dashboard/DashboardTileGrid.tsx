"use client";

import { cn } from "@/lib/utils";

import { DashboardTile } from "./DashboardTile";
import type { DashboardTileConfig } from "./types";

type DashboardTileGridProps = {
  tiles: DashboardTileConfig[];
  onTileClick?: (tileId: string) => void;
  /** Tighter rows for the primary 6-tile block on mobile. */
  density?: "compact" | "comfortable";
  className?: string;
};

export function DashboardTileGrid({
  tiles,
  onTileClick,
  density = "compact",
  className,
}: DashboardTileGridProps) {
  if (tiles.length === 0) return null;

  return (
    <div
      className={cn(
        "vd-anim-stagger grid grid-cols-2 gap-2.5 sm:gap-3",
        density === "compact" &&
          "auto-rows-[minmax(6.875rem,min(11.25dvh,7.25rem))] max-sm:min-h-0",
        density === "comfortable" && "auto-rows-[minmax(8.5rem,auto)]",
        className,
      )}
    >
      {tiles.map((tile) => (
        <DashboardTile
          key={tile.id}
          tile={tile}
          compact={density === "compact"}
          onClick={onTileClick}
        />
      ))}
    </div>
  );
}
