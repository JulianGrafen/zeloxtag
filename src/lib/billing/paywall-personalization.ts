import {
  PRO_PAYWALL_MODAL_BENEFITS,
  PRO_PAYWALL_VALUE_FOOTNOTE,
  PRO_TRIAL_LABEL,
} from "@/lib/billing/pro-plan";
import type { ZeloxPrimaryGoal } from "@/lib/onboarding/primary-goal";
import {
  FEATURE,
  type FeatureFlag,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";

export type PaywallVisualKind = "resale_chart" | "showcase_qr" | "vault_gap";

export type PaywallPersonalization = {
  goal: ZeloxPrimaryGoal;
  headline: string;
  visualKind: PaywallVisualKind;
  benefits: readonly string[];
  ctaLabel: string;
  stickyMicroCopy: string;
  footnote: string;
  visualAriaLabel: string;
};

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
}): ZeloxPrimaryGoal {
  if (input.primaryGoal) return input.primaryGoal;
  return inferPrimaryGoalFromFeature(input.feature);
}

export function getPaywallPersonalization(input: {
  goal: ZeloxPrimaryGoal;
  variant?: PaywallVariant;
}): PaywallPersonalization {
  const { goal, variant = "default" } = input;
  let headline = HEADLINE_BY_GOAL[goal];
  if (variant === "free_scan_exhausted" && goal === "documents") {
    headline = HEADLINE_SCAN_EXHAUSTED_DOCUMENTS;
  }

  return {
    goal,
    headline,
    visualKind: VISUAL_KIND_BY_GOAL[goal],
    benefits: reorderBenefits(goal),
    ctaLabel: CTA_BY_GOAL[goal],
    stickyMicroCopy: MICROCOPY_BY_GOAL[goal],
    footnote: FOOTNOTE_BY_GOAL[goal],
    visualAriaLabel: VISUAL_ARIA_BY_GOAL[goal],
  };
}
