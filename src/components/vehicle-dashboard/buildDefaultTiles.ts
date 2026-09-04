import type {
  DashboardIconName,
  DashboardTileConfig,
  VehicleDashboardData,
} from "./types";
import { formatTuevYearMonth, formatDocumentDate } from "@/lib/documents/format";

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

function oilChangeMeta(data: VehicleDashboardData): DashboardTileConfig["meta"] {
  if (!data.lastOilChange) {
    return { subtitle: "Noch offen", href: "/intervalle" };
  }

  const formatted = formatDocumentDate(data.lastOilChange);

  return {
    subtitle: formatted,
    href: "/intervalle",
  };
}

type TileDraft = Omit<DashboardTileConfig, "icon"> & {
  icon: DashboardIconName;
};

export function buildDefaultTiles(data: VehicleDashboardData): DashboardTileConfig[] {
  const inspectionDays = data.nextInspection
    ? daysUntil(data.nextInspection.nextDate)
    : null;

  const tiles: TileDraft[] = [
    {
      id: "invoices",
      title: "Belege",
      icon: "file-text",
      meta: { href: "/rechnungen" },
    },
    {
      id: "oil-change",
      title: "Ölwechsel",
      icon: "droplet",
      meta: oilChangeMeta(data),
    },
    {
      id: "abe",
      title: "ABE",
      icon: "stamp",
      tone: "accent",
      meta: { href: "/abe" },
    },
    {
      id: "tuning-history",
      title: "Manuelle Einträge",
      icon: "history",
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
      id: "timeline",
      title: "Historie",
      icon: "history",
      featured: true,
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
      id: "modifications",
      title: "Umbauten",
      icon: "images",
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
      title: "Konto",
      icon: "settings",
      featured: true,
      meta: {
        subtitle: "2FA & Sicherheit",
        href: "/settings",
      },
    },
  ];

  return tiles;
}
