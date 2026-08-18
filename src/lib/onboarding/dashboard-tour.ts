/**
 * First-login dashboard onboarding tour — step catalog + persistence.
 */

export const DASHBOARD_TOUR_STORAGE_KEY = "zt_dashboard_tour_v1";
export const DASHBOARD_TOUR_VERSION = 1;
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
    body: "Deine digitale Visitenkarte ist kostenlos. In zwei Minuten zeigen wir dir, wo Profil, Belege und Scan liegen — Akte, KI-Scan und Exposé gehören zu Pro.",
  },
  {
    id: "header",
    target: "[data-tour='dashboard-header']",
    title: "Dein Fahrzeug-Dashboard",
    body: "Hier siehst du auf einen Blick, welches Auto verbunden ist und dass dein ZeloxTag aktiv ist.",
    placement: "bottom",
  },
  {
    id: "menu",
    target: "[data-tour='tile-grid']",
    title: "Fahrzeugmenü",
    body: "Alle wichtigen Bereiche liegen als Kacheln bereit. Tippe eine Kachel an, um Dokumente zu öffnen oder etwas einzutragen.",
    placement: "top",
  },
  {
    id: "invoices",
    target: "[data-tour='tile-invoices']",
    title: "Rechnungen & Belege",
    body: "Werkstattrechnungen, Reparaturen und Service-Belege. Mit Suche und Filtern findest du jeden Beleg in Sekunden.",
    placement: "bottom",
  },
  {
    id: "oil",
    target: "[data-tour='tile-oil-change']",
    title: "Öl-Wechsel",
    body: "Ölwechsel manuell eintragen oder per Rechnung scannen — Historie und nächster Termin im Blick.",
    placement: "bottom",
  },
  {
    id: "abe",
    target: "[data-tour='tile-abe']",
    title: "ABE & Gutachten",
    body: "Teilegutachten und Freigaben. Beim Scan prüft ZeloxTag, ob dein konkretes Fahrzeug im Verwendungsbereich steht.",
    placement: "bottom",
  },
  {
    id: "tuning",
    target: "[data-tour='tile-tuning-history']",
    title: "Wartung & Tuning",
    body: "Eigene Einträge ohne Beleg — z. B. selbst erledigte Wartung. Optional mit Fotos dokumentieren.",
    placement: "bottom",
  },
  {
    id: "tuv",
    target: "[data-tour='tile-tuv']",
    title: "TÜV / HU",
    body: "Berichte und Termine zur Hauptuntersuchung. So weißt du immer, wann die nächste Prüfung ansteht.",
    placement: "top",
  },
  {
    id: "service",
    target: "[data-tour='tile-service']",
    title: "Service & Inspektion",
    body: "Inspektionsbelege scannen und die Service-Historie sauber ablegen.",
    placement: "top",
  },
  {
    id: "schrauber",
    target: "[data-tour='tile-schrauber']",
    title: "Schrauber einladen",
    body: "Teile Schreibzugriff mit deiner Werkstatt. Sie kann Reparaturen und Service eintragen — ohne dein Passwort.",
    placement: "top",
  },
  {
    id: "umbauten",
    target: "[data-tour='tile-modifications']",
    title: "Umbau-Bilder",
    body: "Tuning und Umbauten mit Fotos festhalten — durchsuchbar für dich und bei einer Kontrolle.",
    placement: "top",
  },
  {
    id: "specs",
    target: "[data-tour='tile-specs']",
    title: "Technische Daten",
    body: "Marke, Modell, VIN sowie Antrieb und Fahrwerk hinterlegen — jederzeit bearbeitbar.",
    placement: "top",
  },
  {
    id: "settings",
    target: "[data-tour='tile-settings']",
    title: "Konto & Sicherheit",
    body: "Hier aktivierst du die Zwei-Faktor-Authentifizierung und meldest dich wieder ab.",
    placement: "top",
  },
  {
    id: "scan",
    target: "[data-tour='scan-fab']",
    title: "Dokument scannen",
    body: "Der Einstieg in die Pro-Akte: Foto oder PDF aufnehmen — ZeloxTag erkennt den Typ und füllt die Felder vor. Ohne Abo bleibt die Visitenkarte frei.",
    placement: "top",
  },
  {
    id: "done",
    title: "Alles klar — leg los",
    body: "Profil und öffentlicher Tag sind startklar. KI-Scan, Akte und Exposé schaltest du mit Pro frei. Die Tour kannst du später über ?tour=1 erneut starten.",
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

/** Vehicle dashboard with the guided tour forced (post-Stripe-payment). */
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
  checkout?: string | string[];
}): boolean {
  const tour = Array.isArray(search.tour) ? search.tour[0] : search.tour;
  const checkout = Array.isArray(search.checkout)
    ? search.checkout[0]
    : search.checkout;
  return tour === "1" || checkout === "success";
}

export function wantsForcedDashboardTour(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return isForcedDashboardTourSearch({
    tour: params.get(DASHBOARD_TOUR_QUERY) ?? undefined,
    checkout: params.get("checkout") ?? undefined,
  });
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
