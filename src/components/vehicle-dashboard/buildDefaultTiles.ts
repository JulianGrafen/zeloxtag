import type {
  DashboardIconName,
  DashboardTileConfig,
  VehicleDashboardData,
} from "./types";

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  const formatted = new Date(inspection.nextDate).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return {
    subtitle: `${formatted} · ${countdown}`,
    badge: days <= 30 ? (days < 0 ? "Überfällig" : "Bald") : undefined,
  };
}

function oilChangeMeta(data: VehicleDashboardData): DashboardTileConfig["meta"] {
  if (!data.lastOilChange) {
    return { subtitle: "Letzter Ölwechsel", href: "/intervalle" };
  }

  const formatted = new Date(data.lastOilChange).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
      title: "Intervalle",
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
      title: "Wartung & Tuning",
      description: "Selbst eintragen ohne Beleg",
      icon: "history",
      meta: { subtitle: "Eigene Einträge" },
    },
    {
      id: "tuv",
      title: "Nächste TÜV-Prüfung",
      description: "HU / AU Termin",
      icon: "shield-check",
      tone:
        inspectionDays !== null && inspectionDays <= 30 ? "warning" : "default",
      featured: true,
      meta: inspectionMeta(data),
    },
    {
      id: "service",
      title: "Service & Wartung",
      description: "Inspektionen einlesen",
      icon: "wrench",
      meta: { subtitle: "Belege scannen" },
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
      description: "Historie der Umbauten",
      icon: "images",
    },
    {
      id: "specs",
      title: "Technische Daten",
      description: "Antrieb & Fahrwerk",
      icon: "info",
    },
    {
      id: "roadside",
      title: "Pannenhilfe",
      description: "Sofortige Unterstützung",
      icon: "triangle-alert",
      tone: "critical",
      meta: {
        subtitle: data.roadsidePhone
          ? `Anrufen ${data.roadsidePhone}`
          : "Tippen zum Anrufen",
        href: data.roadsidePhone
          ? `tel:${data.roadsidePhone.replace(/\s+/g, "")}`
          : undefined,
        badge: "SOS",
      },
    },
    {
      id: "settings",
      title: "2FA",
      description: "Konto schützen",
      icon: "settings",
      meta: {
        subtitle: "Zwei-Faktor-Authentifizierung",
        href: "/settings",
      },
    },
  ];

  return tiles;
}
