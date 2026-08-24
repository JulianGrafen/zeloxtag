import type {
  DashboardIconName,
  DashboardTileConfig,
  VehicleDashboardData,
} from "./types";
import { formatTuevYearMonth } from "@/lib/documents/format";

const BERLIN: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Berlin",
};

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
    return { subtitle: "Letzter Ölwechsel", href: "/intervalle" };
  }

  const formatted = new Date(
    data.lastOilChange.length === 10
      ? `${data.lastOilChange}T12:00:00`
      : data.lastOilChange,
  ).toLocaleDateString("de-DE", BERLIN);

  return {
    subtitle: `Letzter Ölwechsel · ${formatted}`,
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
      title: "Rechnungen & Belege",
      description: "Service, Tuning & Teile",
      icon: "file-text",
      meta: { href: "/rechnungen" },
    },
    {
      id: "oil-change",
      title: "Öl-Wechsel",
      icon: "droplet",
      meta: oilChangeMeta(data),
    },
    {
      id: "abe",
      title: "ABE & Gutachten",
      description: "Zulassungen & Konformität",
      icon: "stamp",
      tone: "accent",
      meta: { href: "/abe" },
    },
    {
      id: "tuning-history",
      title: "Manuelle Einträge",
      description: "Wartung & Tuning ohne Beleg",
      icon: "history",
      meta: { subtitle: "Eigene Notizen" },
    },
    {
      id: "tuv",
      title: "TÜV / HU",
      description: "Hauptuntersuchung",
      icon: "shield-check",
      tone:
        inspectionDays !== null && inspectionDays <= 30 ? "warning" : "default",
      featured: true,
      meta: inspectionMeta(data),
    },
    {
      id: "timeline",
      title: "Service-Historie",
      description: "Chronologie nach KM-Stand",
      icon: "history",
      featured: true,
      meta: { subtitle: "Öl · Reparatur · TÜV" },
    },
    {
      id: "service",
      title: "Service & Inspektion",
      description: "Wartungsbelege",
      icon: "wrench",
      meta: { subtitle: "Inspektionen" },
    },
    {
      id: "schrauber",
      title: "Schrauber",
      description: "Werkstatt-Zugang teilen",
      icon: "users",
      meta: { subtitle: "Reparaturen eintragen lassen" },
    },
    {
      id: "modifications",
      title: "Umbau-Bilder",
      description: "Umbauten mit Fotos",
      icon: "images",
      meta: { subtitle: "Galerie" },
    },
    {
      id: "specs",
      title: "Technische Daten",
      description: "Antrieb & Fahrwerk",
      icon: "info",
    },
    {
      id: "vehicle-settings",
      title: "Showcase",
      description: "Öffentliches Profil & Exposé",
      icon: "globe",
      featured: true,
      meta: { subtitle: "Sichtbarkeit" },
    },
    {
      id: "settings",
      title: "Konto",
      description: "2FA & Abmelden",
      icon: "settings",
      featured: true,
      meta: {
        subtitle: "Sicherheit und Sitzung",
        href: "/settings",
      },
    },
  ];

  return tiles;
}
