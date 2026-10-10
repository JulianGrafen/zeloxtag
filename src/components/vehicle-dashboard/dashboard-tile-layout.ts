import type { DashboardTileConfig, DashboardTileId } from "./types";

/** First six menu tiles — 3×2 on mobile (viewport-optimized block). */
export const DASHBOARD_PRIMARY_TILE_IDS: readonly DashboardTileId[] = [
  "invoices",
  "oil-change",
  "abe",
  "tuning-history",
  "fuel-log",
  "operating-costs",
] as const;

const primaryIdSet = new Set<string>(DASHBOARD_PRIMARY_TILE_IDS);

export function partitionDashboardTiles(tiles: DashboardTileConfig[]): {
  primary: DashboardTileConfig[];
  secondary: DashboardTileConfig[];
} {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const primary = DASHBOARD_PRIMARY_TILE_IDS.flatMap((id) => {
    const tile = byId.get(id);
    if (!tile) return [];
    return [{ ...tile, featured: false }];
  });
  const secondary = tiles.filter((tile) => !primaryIdSet.has(String(tile.id)));
  return { primary, secondary };
}
