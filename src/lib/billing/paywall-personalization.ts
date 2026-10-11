import {
  PRO_PAYWALL_CONVERSION_BENEFITS,
  PRO_PAYWALL_CONVERSION_FOOTNOTE,
  PRO_PAYWALL_CONVERSION_SUBLINE,
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
  /** e.g. "BMW M3 · 2019" — personalisiert Headline. */
  vehicleLabel?: string | null;
};

export type PaywallPersonalization = {
  goal: ZeloxPrimaryGoal;
  headline: string;
  subline: string;
  vehicleEyebrow: string | null;
  showProBadge: boolean;
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

/** Headline ohne Baujahr — „Dein Toyota GR Supra. Lückenlos.“ */
export function paywallVehicleShortName(
  vehicleLabel: string | null | undefined,
): string | null {
  if (!vehicleLabel?.trim()) return null;
  const parts = vehicleLabel.split(" · ").map((part) => part.trim());
  if (parts.length >= 2 && /^\d{4}$/.test(parts[parts.length - 1] ?? "")) {
    const withoutYear = parts.slice(0, -1).join(" · ").trim();
    return withoutYear || vehicleLabel.trim();
  }
  return vehicleLabel.trim();
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
  const { goal } = input;
  const vehicleShort = paywallVehicleShortName(input.vehicleLabel);

  const headline = vehicleShort
    ? `Dein ${vehicleShort}. Lückenlos.`
    : "Dein Build. Lückenlos.";

  return {
    goal,
    headline,
    subline: PRO_PAYWALL_CONVERSION_SUBLINE,
    vehicleEyebrow: null,
    showProBadge: false,
    visualKind: "resale_chart",
    benefits: PRO_PAYWALL_CONVERSION_BENEFITS,
    ctaLabel: PRO_TRIAL_LABEL,
    stickyMicroCopy: "",
    footnote: PRO_PAYWALL_CONVERSION_FOOTNOTE,
    visualAriaLabel:
      "Umbau-Werthaltung: mit lückenloser Dokumentation höherer Verkaufswert",
  };
}
