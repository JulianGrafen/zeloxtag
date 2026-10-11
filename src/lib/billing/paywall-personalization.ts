import {
  PRO_PAYWALL_MODAL_BENEFITS,
  PRO_PAYWALL_MODAL_SUBLINE,
  PRO_PAYWALL_VALUE_FOOTNOTE,
  PRO_TRIAL_LABEL,
} from "@/lib/billing/pro-plan";
import type { ZeloxPrimaryGoal } from "@/lib/onboarding/primary-goal";
import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";
import {
  FEATURE,
  type FeatureFlag,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";

export type PaywallVisualKind = "resale_chart" | "showcase_qr" | "vault_gap";

export type PaywallTriggerContext = {
  /** Contextual goal for this modal (e.g. Rechnung tile → Werterhalt). */
  goalOverride?: ZeloxPrimaryGoal;
  /** e.g. "BMW M3 · 2019" — personalisiert Headline & Subline. */
  vehicleLabel?: string | null;
};

export type PaywallPersonalization = {
  goal: ZeloxPrimaryGoal;
  headline: string;
  subline: string;
  vehicleEyebrow: string | null;
  visualKind: PaywallVisualKind;
  benefits: readonly string[];
  ctaLabel: string;
  stickyMicroCopy: string;
  footnote: string;
  visualAriaLabel: string;
};

/** Kurzlabel für Paywall-Copy (Marke/Modell, optional Baujahr). */
export function formatPaywallVehicleLabel(
  make: string | null | undefined,
  model: string | null | undefined,
  year?: number | null,
): string | null {
  const title = formatPublicVehicleTitle(make, model);
  if (!title) return null;
  if (year != null && Number.isFinite(year)) {
    return `${title} · ${year}`;
  }
  return title;
}

function withVehicle(template: string, vehicleLabel: string): string {
  return template.replace(/\{vehicle\}/g, vehicleLabel);
}

const BENEFIT_ORDER: Record<ZeloxPrimaryGoal, readonly string[]> = {
  werterhalt: [
    "Werterhalt:",
    "Verkaufs-Exposé:",
    "Gutachten-Tresor:",
    "Keine Tipparbeit:",
    "QR auf Treffen:",
  ],
  showcase: [
    "QR auf Treffen:",
    "Keine Tipparbeit:",
    "Werterhalt:",
    "Gutachten-Tresor:",
    "Verkaufs-Exposé:",
  ],
  documents: [
    "Gutachten-Tresor:",
    "Keine Tipparbeit:",
    "Werterhalt:",
    "QR auf Treffen:",
    "Verkaufs-Exposé:",
  ],
};

const HEADLINE_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt:
    "Ohne lückenlose Belege verschenkst du beim Verkauf bis zu 20 % deines Builds.",
  showcase:
    "Am Treffen scannt man dein Auto — ohne Pro bleibt dein Build unsichtbar.",
  documents:
    "Eine verlegte ABE kann teuer werden — halt Gutachten und Belege an einem Ort.",
};

const HEADLINE_SCAN_EXHAUSTED_DOCUMENTS =
  "Dein Gratis-Scan ist weg — ohne Pro fehlt dir der schnellste Weg in die Akte.";

const HEADLINE_SCAN_EXHAUSTED_WERTERHALT =
  "Dein Gratis-Scan ist weg — ohne Pro fehlt der Beleg für deinen Werterhalt.";

const HEADLINE_VEHICLE_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt:
    "Ohne lückenlose Belege verschenkst du beim Verkauf von deinem {vehicle} bis zu 20 %.",
  showcase:
    "Am Treffen scannt man deinen {vehicle} — ohne Pro bleibt dein Build unsichtbar.",
  documents:
    "Für deinen {vehicle}: Gutachten und Belege an einem Ort — sonst wird's teuer.",
};

const HEADLINE_SCAN_EXHAUSTED_WERTERHALT_VEHICLE =
  "Dein Gratis-Scan ist weg — für deinen {vehicle} fehlt ohne Pro der Beleg im Werterhalt.";

const HEADLINE_SCAN_EXHAUSTED_DOCUMENTS_VEHICLE =
  "Dein Gratis-Scan ist weg — für deinen {vehicle} fehlt ohne Pro der schnellste Weg in die Akte.";

const SUBLINE_VEHICLE =
  "Für deinen {vehicle}: Umbau, Gutachten und Werkstatt — lückenlos dokumentiert und mit einem Scan griffbereit.";

const MICROCOPY_VEHICLE_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt:
    "Jeder fehlende Nachweis für deinen {vehicle} kostet beim Verkauf — Pro sichert alles ab.",
  showcase:
    "Ohne Pro zeigt dein QR am {vehicle} kein Mod-Profil — Interessenten sehen nichts.",
  documents:
    "Zettel im Handschuhfach verlieren sich — Pro behält jeden Beleg für deinen {vehicle}.",
};

const FOOTNOTE_VEHICLE_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt:
    "Weniger als eine halbe Tankfüllung — dafür den Verkaufswert von deinem {vehicle} absichern.",
  showcase:
    "Weniger als eine halbe Tankfüllung — dafür deinen {vehicle} live am Treffen zeigen.",
  documents:
    "Weniger als eine halbe Tankfüllung — dafür die komplette Akte für deinen {vehicle}.",
};

const VISUAL_ARIA_VEHICLE_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt:
    "Verkaufswert von {vehicle}: mit ZeloxTag höher als ohne Dokumentation",
  showcase: "QR am {vehicle}: mit Pro Mod-Profil sichtbar, ohne Pro leer",
  documents: "Akte für {vehicle}: mit ZeloxTag alles im Tresor",
};

const CTA_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt: `Verkaufswert absichern · ${PRO_TRIAL_LABEL}`,
  showcase: `Showcase freischalten · ${PRO_TRIAL_LABEL}`,
  documents: `Akte vervollständigen · ${PRO_TRIAL_LABEL}`,
};

const MICROCOPY_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt: "Jeder fehlende Nachweis kostet beim Verkauf — Pro sichert alles ab.",
  showcase: "Ohne Pro zeigt dein QR kein Mod-Profil — Interessenten sehen nichts.",
  documents: "Zettel im Handschuhfach verlieren sich — Pro behält jeden Beleg.",
};

const FOOTNOTE_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt:
    "Weniger als eine halbe Tankfüllung — dafür bis zu 20 % mehr beim Verkauf absichern.",
  showcase:
    "Weniger als eine halbe Tankfüllung — dafür dein Build live am Auto am Treffen.",
  documents: PRO_PAYWALL_VALUE_FOOTNOTE,
};

const VISUAL_KIND_BY_GOAL: Record<ZeloxPrimaryGoal, PaywallVisualKind> = {
  werterhalt: "resale_chart",
  showcase: "showcase_qr",
  documents: "vault_gap",
};

const VISUAL_ARIA_BY_GOAL: Record<ZeloxPrimaryGoal, string> = {
  werterhalt:
    "Fahrzeugwert beim Verkauf: mit ZeloxTag höher als ohne Dokumentation",
  showcase: "QR-Scan am Treffen: mit Pro Mod-Liste sichtbar, ohne Pro leer",
  documents: "Dokumente: mit ZeloxTag alles im Tresor, ohne Pro Lücken im Ordner",
};

function reorderBenefits(goal: ZeloxPrimaryGoal): readonly string[] {
  const order = BENEFIT_ORDER[goal];
  const byPrefix = new Map<string, string>();
  for (const benefit of PRO_PAYWALL_MODAL_BENEFITS) {
    const prefix = benefit.slice(0, benefit.indexOf(":") + 1);
    byPrefix.set(prefix, benefit);
  }
  const ordered: string[] = [];
  for (const prefix of order) {
    const item = byPrefix.get(prefix);
    if (item) ordered.push(item);
  }
  for (const benefit of PRO_PAYWALL_MODAL_BENEFITS) {
    if (!ordered.includes(benefit)) ordered.push(benefit);
  }
  return ordered;
}

export function paywallGoalOverrideForDashboardTile(
  tileId: string,
): ZeloxPrimaryGoal | undefined {
  if (tileId === "invoices") return "werterhalt";
  return undefined;
}

/** Scan picker tile „Rechnung“ → Werterhalt paywall. */
export function paywallGoalOverrideForScanType(
  scanType: string,
): ZeloxPrimaryGoal | undefined {
  if (scanType === "invoice") return "werterhalt";
  return undefined;
}

export function inferPrimaryGoalFromFeature(
  feature: FeatureFlag,
): ZeloxPrimaryGoal {
  switch (feature) {
    case FEATURE.GENERATE_EXPOSE:
      return "werterhalt";
    case FEATURE.SCAN_AI_RECEIPT:
    case FEATURE.DOCUMENT_VAULT:
    case FEATURE.VIEW_DOCUMENT_VAULT:
    case FEATURE.INVITE_SCHRAUBER:
      return "documents";
    default:
      return "documents";
  }
}

export function resolvePaywallGoal(input: {
  primaryGoal: ZeloxPrimaryGoal | null;
  feature: FeatureFlag;
  context?: PaywallTriggerContext;
}): ZeloxPrimaryGoal {
  if (input.context?.goalOverride) return input.context.goalOverride;
  if (input.primaryGoal) return input.primaryGoal;
  return inferPrimaryGoalFromFeature(input.feature);
}

export function getPaywallPersonalization(input: {
  goal: ZeloxPrimaryGoal;
  variant?: PaywallVariant;
  vehicleLabel?: string | null;
}): PaywallPersonalization {
  const { goal, variant = "default" } = input;
  const vehicle = input.vehicleLabel?.trim() || null;
  const hasVehicle = Boolean(vehicle);

  let headline = hasVehicle
    ? HEADLINE_VEHICLE_BY_GOAL[goal]
    : HEADLINE_BY_GOAL[goal];

  if (variant === "free_scan_exhausted" && goal === "documents") {
    headline = hasVehicle
      ? HEADLINE_SCAN_EXHAUSTED_DOCUMENTS_VEHICLE
      : HEADLINE_SCAN_EXHAUSTED_DOCUMENTS;
  }
  if (variant === "free_scan_exhausted" && goal === "werterhalt") {
    headline = hasVehicle
      ? HEADLINE_SCAN_EXHAUSTED_WERTERHALT_VEHICLE
      : HEADLINE_SCAN_EXHAUSTED_WERTERHALT;
  }

  if (hasVehicle) {
    headline = withVehicle(headline, vehicle!);
  }

  const subline = hasVehicle
    ? withVehicle(SUBLINE_VEHICLE, vehicle!)
    : PRO_PAYWALL_MODAL_SUBLINE;

  const stickyMicroCopy = hasVehicle
    ? withVehicle(MICROCOPY_VEHICLE_BY_GOAL[goal], vehicle!)
    : MICROCOPY_BY_GOAL[goal];

  const footnote = hasVehicle
    ? withVehicle(FOOTNOTE_VEHICLE_BY_GOAL[goal], vehicle!)
    : FOOTNOTE_BY_GOAL[goal];

  const visualAriaLabel = hasVehicle
    ? withVehicle(VISUAL_ARIA_VEHICLE_BY_GOAL[goal], vehicle!)
    : VISUAL_ARIA_BY_GOAL[goal];

  return {
    goal,
    headline,
    subline,
    vehicleEyebrow: hasVehicle ? `Dein ${vehicle}` : null,
    visualKind: VISUAL_KIND_BY_GOAL[goal],
    benefits: reorderBenefits(goal),
    ctaLabel: CTA_BY_GOAL[goal],
    stickyMicroCopy,
    footnote,
    visualAriaLabel,
  };
}
