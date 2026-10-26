import type {
  DashboardIconName,
  DashboardTileConfig,
  DashboardTileId,
  VehicleDashboardData,
} from "./types";
import { formatTuevYearMonth } from "@/lib/documents/format";
import { DASHBOARD_PRIMARY_TILE_IDS } from "./dashboard-tile-layout";

function daysUntil(isoDate: string): number {
  const target = new Date(
    isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate,
  );
  const today = new Date();
  const berlinToday = new Date(
    today.toLocaleString("en-US", { timeZone: "Europe/Berlin" }),
  );
  berlinToday.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil(
    (target.getTime() - berlinToday.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function inspectionMeta(data: VehicleDashboardData): DashboardTileConfig["meta"] {
  const inspection = data.nextInspection;
  if (!inspection) {
    return { subtitle: "Termin noch nicht hinterlegt" };
  }

  const days = daysUntil(inspection.nextDate);
  const countdown =
    inspection.countdownLabel ??
    (days < 0
      ? `${Math.abs(days)} Tage überfällig`
      : days === 0
        ? "Heute fällig"
        : `Noch ${days} Tage`);

  const formatted = formatTuevYearMonth(inspection.nextDate);

  return {
    subtitle: `${formatted} · ${countdown}`,
  };
}

function serviceMaintenanceMeta(
  data: VehicleDashboardData,
): DashboardTileConfig["meta"] {
  const maintenance = data.serviceMaintenance;
  if (maintenance?.subtitle) {
    return {
      subtitle: maintenance.subtitle,
      href: "/intervalle",
      badge:
        maintenance.tone === "critical"
          ? "Fällig"
          : maintenance.tone === "warning"
            ? "Bald fällig"
            : undefined,
    };
  }

  const legacy = data.lastOilChange
    ? `Letzter Wechsel · ${data.lastOilChange}`
    : null;
  return {
    subtitle: legacy ?? "Noch offen",
    href: "/intervalle",
  };
}

type TileDraft = Omit<DashboardTileConfig, "icon"> & {
  icon: DashboardIconName;
};

type CoreTileSpec = {
  id: DashboardTileId;
  title: string;
  icon: DashboardIconName;
  meta?: DashboardTileConfig["meta"];
  metaFromData?: (data: VehicleDashboardData) => DashboardTileConfig["meta"];
};

const CORE_MENU_TILE_SPECS: CoreTileSpec[] = [
  {
    id: "invoices",
    title: "Belege",
    icon: "file-text",
    meta: { href: "/rechnungen" },
  },
  {
    id: "service-maintenance",
    title: "Service & Wartung",
    icon: "wrench",
    metaFromData: serviceMaintenanceMeta,
  },
  {
    id: "abe",
    title: "ABE & Gutachten",
    icon: "stamp",
  },
  {
    id: "modifications",
    title: "Umbauten",
    icon: "images",
  },
  {
    id: "fuel-log",
    title: "Tanken",
    icon: "fuel",
  },
  {
    id: "operating-costs",
    title: "Kostenübersicht",
    icon: "wallet",
  },
];

function buildCoreMenuTiles(data: VehicleDashboardData): TileDraft[] {
  return CORE_MENU_TILE_SPECS.map((spec) => ({
    id: spec.id,
    title: spec.title,
    icon: spec.icon,
    meta: spec.metaFromData ? spec.metaFromData(data) : spec.meta,
  }));
}

function buildExtendedMenuTiles(data: VehicleDashboardData): TileDraft[] {
  const inspectionDays = data.nextInspection
    ? daysUntil(data.nextInspection.nextDate)
    : null;

  return [
    {
      id: "build-discover",
      title: "Builds entdecken",
      icon: "sparkles",
      featured: true,
    },
    {
      id: "tuv",
      title: "TÜV",
      icon: "shield-check",
      tone:
        inspectionDays !== null && inspectionDays <= 30 ? "warning" : "default",
      featured: true,
      meta: inspectionMeta(data),
    },
    {
      id: "service",
      title: "Service",
      icon: "wrench",
    },
    {
      id: "schrauber",
      title: "Werkstatt",
      icon: "users",
    },
    {
      id: "specs",
      title: "Fahrzeugdaten",
      icon: "info",
    },
    {
      id: "vehicle-settings",
      title: "Showcase",
      icon: "globe",
      featured: true,
    },
    {
      id: "settings",
      title: "Einstellungen",
      icon: "settings",
      featured: true,
      meta: {
        subtitle: "Dark Mode · 2FA & Konto",
        href: "/settings",
      },
    },
  ];
}

export function buildDefaultTiles(data: VehicleDashboardData): DashboardTileConfig[] {
  return [...buildCoreMenuTiles(data), ...buildExtendedMenuTiles(data)];
}

export { DASHBOARD_PRIMARY_TILE_IDS };
