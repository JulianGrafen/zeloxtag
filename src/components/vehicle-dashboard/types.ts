export type DashboardTileId =
  | "invoices"
  | "oil-change"
  | "abe"
  | "tuv"
  | "service"
  | "timeline"
  | "modifications"
  | "tuning-history"
  | "specs"
  | "settings"
  | "schrauber";

/** Serializable icon keys (resolved to Lucide on the client). */
export type DashboardIconName =
  | "file-text"
  | "droplet"
  | "stamp"
  | "history"
  | "shield-check"
  | "wrench"
  | "images"
  | "info"
  | "settings"
  | "users";

export type DashboardTileTone =
  | "default"
  | "accent"
  | "warning"
  | "critical";

export interface DashboardTileMeta {
  /** Optional secondary line under the title (e.g. "42 days left") */
  subtitle?: string;
  /** Highlight badge text (e.g. "Due soon") */
  badge?: string;
  /** Direct action URL for the tile */
  href?: string;
}

export interface DashboardTileConfig {
  id: DashboardTileId | (string & {});
  title: string;
  description?: string;
  icon: DashboardIconName;
  tone?: DashboardTileTone;
  meta?: DashboardTileMeta;
  /** Span full width on mobile grid */
  featured?: boolean;
}

export interface VehicleInspectionInfo {
  nextDate: string;
  /** Precomputed countdown label; if omitted, derived from nextDate */
  countdownLabel?: string;
}

export interface VehicleDashboardData {
  ownerName: string;
  vehicleModel: string;
  /** Optional real photo; falls back to silhouette */
  vehicleImage?: string;
  vehicleImageFallback?: string;
  /** Data URL when proxy fails (owner upload session). */
  vehicleImagePreviewFallback?: string;
  vehicleImageAlt?: string;
  /** Show catalog cutout PNG without the rounded header frame (demo showcase). */
  vehicleImageFrameless?: boolean;
  /** Accent label under the greeting, e.g. "QR Tag · Active" */
  statusLabel?: string;
  /** ISO-Datum des letzten Ölwechsels */
  lastOilChange?: string;
  nextInspection?: VehicleInspectionInfo;
  /** Override or extend the default tile set */
  tiles?: DashboardTileConfig[];
}

export interface VehicleDashboardProps {
  data: VehicleDashboardData;
  /** Called when a tile without href is activated */
  onTileClick?: (tileId: string) => void;
  /** Owner tap on header cutout → change / upload silhouette */
  onEditVehicleImage?: () => void;
  onSilhouetteProxyLoad?: () => void;
  className?: string;
}
