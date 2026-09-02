/**
 * ZeloxTag feature flags and tiers.
 *
 * Free is the default (no Stripe membership). Pro is derived from an active
 * Cloud subscription — never stored as a separate user column.
 */

import { FREE_AI_INVOICE_SCAN_LIMIT } from "@/lib/billing/free-scan-constants";

export const USER_TIERS = ["free", "pro"] as const;
export type UserTier = (typeof USER_TIERS)[number];

export const FEATURE = {
  VIEW_PUBLIC_PROFILE: "CAN_VIEW_PUBLIC_PROFILE",
  EDIT_BASIC_PROFILE: "CAN_EDIT_BASIC_PROFILE",
  CLAIM_TAG: "CAN_CLAIM_TAG",
  ADD_MANUAL_SERVICE_ENTRY: "CAN_ADD_MANUAL_SERVICE_ENTRY",
  /** Browse documents, timeline links, and manual entries in the vault UI. */
  VIEW_DOCUMENT_VAULT: "CAN_VIEW_DOCUMENT_VAULT",
  SCAN_AI_RECEIPT: "CAN_SCAN_AI_RECEIPT",
  GENERATE_EXPOSE: "CAN_GENERATE_EXPOSE",
  DOCUMENT_VAULT: "CAN_USE_DOCUMENT_VAULT",
  INVITE_SCHRAUBER: "CAN_INVITE_SCHRAUBER",
} as const;

export type FeatureFlag = (typeof FEATURE)[keyof typeof FEATURE];

/** Minimum tier required to use a feature. */
const FEATURE_MIN_TIER: Record<FeatureFlag, UserTier> = {
  [FEATURE.VIEW_PUBLIC_PROFILE]: "free",
  [FEATURE.EDIT_BASIC_PROFILE]: "free",
  [FEATURE.CLAIM_TAG]: "free",
  [FEATURE.ADD_MANUAL_SERVICE_ENTRY]: "free",
  [FEATURE.VIEW_DOCUMENT_VAULT]: "free",
  [FEATURE.SCAN_AI_RECEIPT]: "pro",
  [FEATURE.GENERATE_EXPOSE]: "pro",
  [FEATURE.DOCUMENT_VAULT]: "pro",
  [FEATURE.INVITE_SCHRAUBER]: "pro",
};

export const SUBSCRIPTION_REQUIRED_CODE = "SUBSCRIPTION_REQUIRED" as const;
export const FREE_SCAN_EXHAUSTED_CODE = "FREE_SCAN_EXHAUSTED" as const;

export type PaywallVariant = "default" | "free_scan_exhausted";

export function resolveUserTier(hasActiveMembership: boolean): UserTier {
  return hasActiveMembership ? "pro" : "free";
}

export function hasFeatureAccess(
  tier: UserTier,
  feature: FeatureFlag,
): boolean {
  if (FEATURE_MIN_TIER[feature] === "free") return true;
  return tier === "pro";
}

export function isProOnlyFeature(feature: FeatureFlag): boolean {
  return FEATURE_MIN_TIER[feature] === "pro";
}

/** Dashboard tiles that belong to the free digital business card. */
export const FREE_DASHBOARD_TILE_IDS = new Set([
  "specs",
  "vehicle-settings",
  "settings",
]);

export function featureForDashboardTile(tileId: string): FeatureFlag | null {
  if (FREE_DASHBOARD_TILE_IDS.has(tileId)) {
    return FEATURE.EDIT_BASIC_PROFILE;
  }

  if (tileId === "schrauber") return FEATURE.INVITE_SCHRAUBER;

  if (
    tileId === "oil-change" ||
    tileId === "tuning-history" ||
    tileId === "timeline"
  ) {
    return FEATURE.ADD_MANUAL_SERVICE_ENTRY;
  }

  if (
    tileId === "invoices" ||
    tileId === "abe" ||
    tileId === "tuv" ||
    tileId === "service" ||
    tileId === "modifications"
  ) {
    return FEATURE.VIEW_DOCUMENT_VAULT;
  }

  return null;
}

export function paywallTitle(
  feature: FeatureFlag,
  variant: PaywallVariant = "default",
): string {
  switch (feature) {
    case FEATURE.SCAN_AI_RECEIPT:
      if (variant === "free_scan_exhausted") {
        return "Dein Gratis-Scan ist verbraucht";
      }
      return "KI-Scan ist Teil von Pro";
    case FEATURE.GENERATE_EXPOSE:
      return "Verkaufs-Exposé ist Teil von Pro";
    case FEATURE.INVITE_SCHRAUBER:
      return "Schrauber einladen ist Teil von Pro";
    case FEATURE.DOCUMENT_VAULT:
      return "Belege speichern ist Teil von Pro";
    case FEATURE.VIEW_DOCUMENT_VAULT:
      return "Die Dokumentenakte";
    case FEATURE.ADD_MANUAL_SERVICE_ENTRY:
      return "Manuelle Einträge";
    default:
      return "Das ist eine Pro-Funktion";
  }
}

export function paywallBody(
  feature: FeatureFlag,
  variant: PaywallVariant = "default",
): string {
  switch (feature) {
    case FEATURE.SCAN_AI_RECEIPT:
      if (variant === "free_scan_exhausted") {
        return `Du hast deinen kostenlosen KI-Rechnungsscan genutzt. Für weitere Belege, ABEs und die volle Akte: ZeloxTag Pro — die ersten 14 Tage sind kostenlos.`;
      }
      return `Belege fotografieren und automatisch auslesen — mit ZeloxTag Pro. Oder teste einmal kostenlos (${FREE_AI_INVOICE_SCAN_LIMIT}× KI-Rechnungsscan). Die ersten 14 Tage Pro sind ebenfalls kostenlos.`;
    case FEATURE.GENERATE_EXPOSE:
      return "Das PDF-Verkaufsdossier gibt’s mit Pro. Deine digitale Visitenkarte bleibt kostenlos.";
    case FEATURE.INVITE_SCHRAUBER:
      return "Werkstätten ohne Passwort mitarbeiten lassen — mit ZeloxTag Pro.";
    case FEATURE.DOCUMENT_VAULT:
      return "Rechnungen, ABEs und TÜV per KI scannen und in der Cloud speichern — mit ZeloxTag Pro. Einsehen und manuelle Einträge bleiben kostenlos.";
    case FEATURE.VIEW_DOCUMENT_VAULT:
      return "Deine Akte mit manuellen Einträgen und gespeicherten Belegen — kostenlos einsehbar.";
    default:
      return "Diese Funktion gehört zu ZeloxTag Pro. Die ersten 14 Tage sind kostenlos.";
  }
}
