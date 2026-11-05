/**
 * First-login dashboard onboarding tour — step catalog + persistence.
 */

import type { ZeloxPrimaryGoal } from "@/lib/onboarding/primary-goal";

export const DASHBOARD_TOUR_STORAGE_KEY = "zt_dashboard_tour_v1";
/** v3: Umbauten + „Im Showcase zeigen“ steps; bump re-shows the tour once. */
export const DASHBOARD_TOUR_VERSION = 3;
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
    title: "Willkommen in deiner Garage",
    body: "30 Sekunden: wo du Umbauten einträgst, wie sie ins Showcase kommen und wo deine Belege liegen.",
  },
  {
    id: "header",
    target: "[data-tour='dashboard-header']",
    title: "Dein Fahrzeug",
    body: "Tippe aufs Foto, um es zu ändern.",
    placement: "bottom",
  },
  {
    id: "modifications",
    target: "[data-tour='tile-modifications']",
    title: "Umbauten eintragen",
    body: "Foto, Titel, fertig. Jeder Umbau landet in deiner Chronik.",
    placement: "bottom",
  },
  {
    id: "showcase",
    target: "[data-tour='tile-vehicle-settings']",
    title: "Im Showcase zeigen",
    body: "Hier pflegst du Fahrzeugdaten und Showcase. Unter „Umbauten“ legst du pro Umbau per Schalter fest, ob er mit Bildern öffentlich ist. Preise und Rechnungen bleiben privat.",
    placement: "top",
  },
  {
    id: "scan",
    target: "[data-tour='scan-fab']",
    title: "Rechnung scannen",
    body: "Foto oder PDF. Teile und Kosten werden automatisch erkannt.",
    placement: "top",
  },
  {
    id: "invoices",
    target: "[data-tour='tile-invoices']",
    title: "Belege",
    body: "Rechnungen, ABE, TÜV und Service an einem Ort.",
    placement: "bottom",
  },
  {
    id: "timeline",
    target: "[data-tour='dashboard-chronik-tab']",
    title: "Chronik",
    body: "Alle Umbauten und Services nach Kilometerstand.",
    placement: "bottom",
  },
  {
    id: "werkstatt",
    target: "[data-tour='tile-schrauber']",
    title: "Werkstatt einladen",
    body: "Deine Werkstatt trägt Belege direkt ein, ohne dein Passwort.",
    placement: "bottom",
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
    target: "[data-tour='dashboard-chronik-tab']",
    title: "Chronik",
    body: "Wechsle zum Tab Chronik für alle Einträge nach Kilometerstand — Reparaturen, Service und TÜV auf einen Blick.",
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

const OWNER_STEP_ORDER_BY_GOAL: Record<ZeloxPrimaryGoal, string[]> = {
  werterhalt: [
    "welcome",
    "header",
    "modifications",
    "showcase",
    "timeline",
    "scan",
    "invoices",
    "werkstatt",
  ],
  showcase: [
    "welcome",
    "header",
    "modifications",
    "showcase",
    "scan",
    "invoices",
    "timeline",
    "werkstatt",
  ],
  documents: [
    "welcome",
    "header",
    "scan",
    "invoices",
    "modifications",
    "showcase",
    "timeline",
    "werkstatt",
  ],
};

const OWNER_WELCOME_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt:
    "Werterhalt im Blick: kurz Umbauten, Showcase und Historie.",
  showcase:
    "Dein Auto als Visitenkarte: kurz Umbauten und Showcase.",
  documents:
    "Alles an einem Ort: kurz Scan, Belege und Umbauten.",
};

function orderOwnerSteps(
  steps: DashboardTourStep[],
  goal: ZeloxPrimaryGoal,
): DashboardTourStep[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const ordered: DashboardTourStep[] = [];
  for (const id of OWNER_STEP_ORDER_BY_GOAL[goal]) {
    const step = byId.get(id);
    if (step) ordered.push(step);
  }
  for (const step of steps) {
    if (!ordered.some((s) => s.id === step.id)) ordered.push(step);
  }
  return ordered;
}

function personalizeWelcome(
  steps: DashboardTourStep[],
  goal: ZeloxPrimaryGoal,
): DashboardTourStep[] {
  return steps.map((step) =>
    step.id === "welcome"
      ? { ...step, body: OWNER_WELCOME_BY_GOAL[goal] }
      : step,
  );
}

export function getDashboardTourSteps(
  role: DashboardTourRole,
  primaryGoal?: ZeloxPrimaryGoal | null,
): DashboardTourStep[] {
  if (role !== "owner") return CONTRIBUTOR_STEPS;
  const base = [...OWNER_STEPS];
  if (!primaryGoal) return base;
  return personalizeWelcome(orderOwnerSteps(base, primaryGoal), primaryGoal);
}

/** Vehicle dashboard after first registration (claim with new account). */
export function dashboardTourHref(tagUuid: string): string {
  return `/v/${tagUuid}?${DASHBOARD_TOUR_QUERY}=1`;
}

/** Digital garage dashboard after first vehicle (no physical tag). */
export function garageDashboardTourHref(
  vehicleId: string,
  startTour = true,
): string {
  const base = `/garage/${vehicleId}`;
  if (!startTour) return base;
  return `${base}?${DASHBOARD_TOUR_QUERY}=1&dashboard=1`;
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
