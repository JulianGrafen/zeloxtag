/**
 * First-login dashboard onboarding tour — step catalog + persistence.
 */

export const DASHBOARD_TOUR_STORAGE_KEY = "zt_dashboard_tour_v1";
export const DASHBOARD_TOUR_VERSION = 2;
export const DASHBOARD_TOUR_QUERY = "tour";

const APP_ORIGIN_FOR_PATH = "https://app.zeloxtag.de";

export type DashboardTourRole = "owner" | "contributor";

export type DashboardTourStep = {
  id: string;
  /** CSS selector; omit for centered welcome / finale. */
  target?: string;
  title: string;
  body: string;
  /** Prefer placing the card above/below the spotlight. */
  placement?: "auto" | "top" | "bottom";
};

const OWNER_STEPS: DashboardTourStep[] = [
  {
    id: "welcome",
    title: "Willkommen bei ZeloxTag",
    body: "Kurz die wichtigsten Stellen — Scan, Akte, Historie, Werkstatt, Showcase und Kontosicherheit. Du kannst jederzeit überspringen.",
  },
  {
    id: "header",
    target: "[data-tour='dashboard-header']",
    title: "Profil & Fahrzeug",
    body: "Marke, Modell und dein verbundener ZeloxTag. Tippe auf dein Fahrzeugfoto oben rechts, um es zu ändern.",
    placement: "bottom",
  },
  {
    id: "scan",
    target: "[data-tour='scan-fab']",
    title: "Dokument scannen",
    body: "Der Einstieg in die Akte: Foto oder PDF — ZeloxTag erkennt Typ und Felder. Vor dem Speichern kannst du alles prüfen.",
    placement: "top",
  },
  {
    id: "invoices",
    target: "[data-tour='tile-invoices']",
    title: "Belege & Akte",
    body: "Rechnungen, ABE, TÜV und Service — strukturiert, durchsuchbar, mit Original-PDF in der Detailansicht.",
    placement: "bottom",
  },
  {
    id: "timeline",
    target: "[data-tour='tile-timeline']",
    title: "Historie & Timeline",
    body: "Alle Meilensteine in einer Timeline: Belege, Service, TÜV und Ölwechsel — sortiert nach Kilometerstand. Perfekt für Übergabe und Verkauf.",
    placement: "bottom",
  },
  {
    id: "werkstatt",
    target: "[data-tour='tile-schrauber']",
    title: "Werkstatt & Schrauber",
    body: "Lade Werkstatt oder Schrauber ein. Sie tragen Belege ein und scannen vor Ort — ohne dein Passwort, nur mit den Rechten, die du freigibst.",
    placement: "bottom",
  },
  {
    id: "showcase",
    target: "[data-tour='tile-vehicle-settings']",
    title: "Öffentliches Showcase",
    body: "Steuere, was Interessenten beim QR-Scan sehen: Profil, Galerie, freigegebene Dokumente und Exposé für den Verkauf.",
    placement: "top",
  },
  {
    id: "account",
    target: "[data-tour='tile-settings']",
    title: "Konto & 2FA",
    body: "Hier erreichst du deine Kontoeinstellungen. Richte Zwei-Faktor-Authentifizierung (2FA) per Authenticator-App ein — empfohlen für zusätzlichen Schutz.",
    placement: "top",
  },
];

const CONTRIBUTOR_STEPS: DashboardTourStep[] = [
  {
    id: "welcome",
    title: "Willkommen als Schrauber",
    body: "Du wurdest eingeladen, Belege für dieses Fahrzeug einzutragen. Kurz zeigen wir dir die wichtigsten Flächen.",
  },
  {
    id: "header",
    target: "[data-tour='dashboard-header']",
    title: "Fahrzeugakte",
    body: "Du arbeitest am Fahrzeug des Besitzers — nur mit den freigegebenen Rechten.",
    placement: "bottom",
  },
  {
    id: "invoices",
    target: "[data-tour='tile-invoices']",
    title: "Rechnungen & Reparaturen",
    body: "Hier landen Werkstattbelege. Mit Suche und dem Filter „Reparatur“ findest du Einträge schnell wieder.",
    placement: "bottom",
  },
  {
    id: "timeline",
    target: "[data-tour='tile-timeline']",
    title: "Historie & Timeline",
    body: "Chronologische Übersicht aller Einträge nach Kilometerstand — Reparaturen, Service und TÜV auf einen Blick.",
    placement: "bottom",
  },
  {
    id: "service",
    target: "[data-tour='tile-service']",
    title: "Service",
    body: "Inspektions- und Servicebelege für dieses Fahrzeug.",
    placement: "bottom",
  },
  {
    id: "scan",
    target: "[data-tour='scan-fab']",
    title: "Beleg scannen",
    body: "Starte hier: Reparatur, Service oder Rechnung fotografieren — fertig.",
    placement: "top",
  },
  {
    id: "done",
    title: "Bereit zum Eintragen",
    body: "Viel Erfolg in der Werkstatt. Bei Fragen wendet euch an den Fahrzeughalter.",
  },
];

export function getDashboardTourSteps(
  role: DashboardTourRole,
): DashboardTourStep[] {
  return role === "owner" ? OWNER_STEPS : CONTRIBUTOR_STEPS;
}

/** Vehicle dashboard after first registration (claim with new account). */
export function dashboardTourHref(tagUuid: string): string {
  return `/v/${tagUuid}?${DASHBOARD_TOUR_QUERY}=1`;
}

/**
 * Rewrites an in-app path so the vehicle dashboard opens the tour,
 * not the scanner.
 */
export function withForcedDashboardTour(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return trimmed;
  }
  const url = new URL(trimmed, APP_ORIGIN_FOR_PATH);
  url.searchParams.delete("scan");
  url.searchParams.delete("type");
  url.searchParams.delete("session_id");
  url.searchParams.set(DASHBOARD_TOUR_QUERY, "1");
  return `${url.pathname}${url.search}`;
}

export function isForcedDashboardTourSearch(search: {
  tour?: string | string[];
}): boolean {
  const tour = Array.isArray(search.tour) ? search.tour[0] : search.tour;
  return tour === "1";
}

export function wantsForcedDashboardTour(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(DASHBOARD_TOUR_QUERY) === "1";
}

export function clearForcedDashboardTourFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (
    !url.searchParams.has(DASHBOARD_TOUR_QUERY) &&
    url.searchParams.get("checkout") !== "success"
  ) {
    return;
  }
  url.searchParams.delete(DASHBOARD_TOUR_QUERY);
  if (url.searchParams.get("checkout") === "success") {
    url.searchParams.delete("checkout");
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function isPostPaymentReturn(search: {
  checkout?: string | string[];
  session_id?: string | string[];
}): boolean {
  const checkout = Array.isArray(search.checkout)
    ? search.checkout[0]
    : search.checkout;
  const sessionId = Array.isArray(search.session_id)
    ? search.session_id[0]
    : search.session_id;
  return checkout === "success" || Boolean(sessionId?.startsWith("cs_"));
}

export function hasCompletedDashboardTour(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { v?: number; done?: boolean };
    return Boolean(parsed.done && parsed.v === DASHBOARD_TOUR_VERSION);
  } catch {
    return false;
  }
}

export function markDashboardTourCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DASHBOARD_TOUR_STORAGE_KEY,
      JSON.stringify({
        v: DASHBOARD_TOUR_VERSION,
        done: true,
        at: new Date().toISOString(),
      }),
    );
  } catch {
    // Quota / private mode — ignore.
  }
}

export function resetDashboardTour(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DASHBOARD_TOUR_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Resolve steps whose targets exist (or have no target). */
export function resolveAvailableTourSteps(
  steps: DashboardTourStep[],
): DashboardTourStep[] {
  if (typeof document === "undefined") return steps;
  return steps.filter((step) => {
    if (!step.target) return true;
    return Boolean(document.querySelector(step.target));
  });
}
