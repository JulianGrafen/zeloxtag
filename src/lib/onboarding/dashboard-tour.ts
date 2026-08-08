/**
 * First-login dashboard onboarding tour — step catalog + persistence.
 */

export const DASHBOARD_TOUR_STORAGE_KEY = "zt_dashboard_tour_v1";
export const DASHBOARD_TOUR_VERSION = 1;

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
    body: "In zwei Minuten zeigen wir dir deine digitale Fahrzeugakte — von Belegen über ABEs bis zum Scan. Du kannst die Tour jederzeit überspringen.",
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
    body: "Der wichtigste Einstieg: Foto oder PDF aufnehmen — ZeloxTag erkennt den Typ und füllt die Felder vor.",
    placement: "top",
  },
  {
    id: "done",
    title: "Alles klar — leg los",
    body: "Scanne deinen ersten Beleg oder öffne eine Kachel. Die Tour kannst du später über ?tour=1 erneut starten.",
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
