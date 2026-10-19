/** ZeloxTag Cloud Pro — public checkout copy. */

import {
  FREE_AI_ABE_SCAN_LIMIT,
  FREE_AI_INVOICE_SCAN_LIMIT,
} from "@/lib/billing/free-scan-constants";
import { getTerm } from "@/lib/i18n/terminology";
import type { AppLocale } from "@/lib/i18n/types";

export const PRO_PLAN_NAME = "ZeloxTag Pro";
export const PRO_PLAN_MONTHLY_PRICE = "4,99 €";
export const PRO_PLAN_MONTHLY_REFERENCE_PRICE = "5,99 €";
export const PRO_PLAN_MONTHLY_WEEKLY_PRICE = "1,15 €";
export const PRO_PLAN_ANNUAL_PRICE = "49,90 €";
export const PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY = "4,16 €";
export const PRO_PLAN_ANNUAL_WEEKLY_PRICE = "0,96 €";
export const PRO_PLAN_ANNUAL_REFERENCE_PRICE = "59,88 €";
export const PRO_FOUNDERS_DISCOUNT_LABEL = "Founders Discount";
export const PRO_ANNUAL_SAVINGS_AMOUNT = "10 €";
export const PRO_ANNUAL_SAVINGS_PERCENT = 17;
export const PRO_ANNUAL_DISCOUNT_LABEL = "Spare 17%";
export const PRO_ANNUAL_DISCOUNT_HEADLINE = "Spare 17% · 2 Monate geschenkt";
export const PRO_ANNUAL_DISCOUNT_STORY =
  "Belohnung für deinen fast fertigen Fahrzeugpass";
export const PRO_ANNUAL_RECOMMENDED_LABEL = "Beliebteste Wahl";
export const PRO_ANNUAL_SAVINGS_COPY =
  "2 Monate geschenkt (Spare 10 € gegenüber Monatszahlung)";
/** Legacy Stripe trials only (bestehende Abos); neue Checkouts ohne Testphase. */
export const PRO_TRIAL_DAYS = 14;

export const PRO_FREE_KI_SCAN_HOOK = `Gratis: ${FREE_AI_INVOICE_SCAN_LIMIT}× Rechnung & ${FREE_AI_ABE_SCAN_LIMIT}× ABE per KI scannen`;

/** @deprecated Use {@link proCheckoutButtonLabel} — kept for imports during migration. */
export const PRO_TRIAL_LABEL = "Pro Abo starten";

export const PRO_TRIAL_BADGE_LABEL = PRO_FREE_KI_SCAN_HOOK;
export const PRO_TRIAL_NO_COMMITMENT =
  "Keine Verpflichtung · Jederzeit kündbar";

export function proWeeklyPriceCopy(price: string): string {
  return `${price} pro Woche`;
}

export type ProBillingInterval = "monthly" | "annual";

export const PRO_PLAN_CHECKOUT_HEADLINE =
  "Dein Build verdient mehr als einen zerknitterten Ordner im Handschuhfach.";
export const PRO_PLAN_CHECKOUT_SUBLINE =
  "Jede Schraube, jedes Gutachten, jede Stunde Arbeit – lückenlos dokumentiert und mit einem Scan griffbereit.";

/** Paywall modal — progress endowment framing */
export const PRO_PAYWALL_PROGRESS_PERCENT = 80;
export const PRO_PAYWALL_PROGRESS_LABEL = "Fahrzeugpass zu 80 % eingerichtet";
export const PRO_PAYWALL_MODAL_SUBLINE = PRO_PLAN_CHECKOUT_SUBLINE;
/** Modal hero — former subline; glove-compartment line stays on inline/section paywalls. */
export const PRO_PAYWALL_MODAL_HEADLINE = PRO_PLAN_CHECKOUT_SUBLINE;
export const PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER =
  "Dein Gratis-Scan ist verbraucht";
export const PRO_PAYWALL_STICKY_MICROCOPY = PRO_TRIAL_NO_COMMITMENT;
export const PRO_PAYWALL_MODAL_MICROCOPY = "Jederzeit kündbar";
export const PRO_PAYWALL_DISMISS_LABEL = "Mit ZeloxTag Free fortfahren";
export const PRO_PAYWALL_BRAND_BADGE = "ZELOXTAG PRO";
export const PRO_PAYWALL_CONVERSION_SUBLINE =
  "Wert, Umbau & Historie felsenfest belegt.";
export const PRO_PAYWALL_CONVERSION_FOOTNOTE =
  "Kostet im Monat weniger als ein Liter Motoröl und sichert Umbauten im Wert von tausenden Euro ab.";
export const PRO_PAYWALL_ANNUAL_BEST_DEAL_LABEL = "Bester Deal";
export const PRO_MONTHLY_CARD_SUBLINE =
  "Volle Flexibilität. Jederzeit mit einem Klick kündbar.";
export const PRO_ANNUAL_CARD_HIGHLIGHT = "2 Monate geschenkt";
export const PRO_PAYWALL_VALUE_FOOTNOTE =
  "Weniger als eine halbe Tankfüllung für ein ganzes Jahr Schutz und Dokumentation deines Builds.";

/** Kompakte 3-Säulen-Copy in der Conversion-Paywall (Modal & Section). */
export const PRO_PAYWALL_CONVERSION_BENEFITS = [
  "Unbegrenzte KI-Scans: Rechnungen in Sekunden digitalisieren & detaillierter Kostenüberblick.",
  "TÜV- & Gutachten-Tresor: Alle ABEs und Teilegutachten sofort griffbereit.",
  "PDF-Expose: Verkaufs-PDF mit Umbau, Specs und Werten — ohne sensible Belege.",
] as const;

export const PRO_PAYWALL_MODAL_BENEFITS = PRO_PAYWALL_CONVERSION_BENEFITS;

export function proPaywallConversionBenefits(
  locale: AppLocale = "de",
): readonly string[] {
  return [
    PRO_PAYWALL_CONVERSION_BENEFITS[0],
    getTerm("proVaultBenefit", locale),
    PRO_PAYWALL_CONVERSION_BENEFITS[2],
  ] as const;
}

export type ProPaywallPricingAnchor = {
  referencePrice?: string;
  currentPrice: string;
  monthlyEquivalent?: string;
  flexSubline?: string;
};

export function proPaywallPricingAnchor(
  interval: ProBillingInterval,
): ProPaywallPricingAnchor {
  if (interval === "annual") {
    return {
      referencePrice: `${PRO_PLAN_ANNUAL_REFERENCE_PRICE} / Jahr`,
      currentPrice: `${PRO_PLAN_ANNUAL_PRICE} / Jahr`,
      monthlyEquivalent: PRO_ANNUAL_CARD_HIGHLIGHT,
    };
  }
  return {
    currentPrice: `${PRO_PLAN_MONTHLY_PRICE} / Monat`,
    flexSubline: PRO_MONTHLY_CARD_SUBLINE,
  };
}

export type ProPaywallTimelineIcon = "check" | "mail" | "shield";

export type ProPaywallTimelineNode = {
  icon: ProPaywallTimelineIcon;
  text: string;
};

export const PRO_PAYWALL_TRIAL_TIMELINE: readonly ProPaywallTimelineNode[] = [
  {
    icon: "check",
    text: `Free: ${FREE_AI_INVOICE_SCAN_LIMIT}× Rechnung und ${FREE_AI_ABE_SCAN_LIMIT}× ABE per KI scannen`,
  },
  {
    icon: "shield",
    text: "Pro: Unbegrenzte KI-Scans, Tresor und volle Akte",
  },
  {
    icon: "mail",
    text: "Abo: Sofort starten · Jederzeit kündbar",
  },
] as const;

export type PaywallPricingCardCopy = {
  title: string;
  primaryPrice: string;
  secondaryLine?: string;
  subline: string;
  bestDealBadge?: string;
  discountBadge?: string;
};

export function proPaywallCardCopy(
  interval: ProBillingInterval,
): PaywallPricingCardCopy {
  if (interval === "annual") {
    return {
      title: "Jährlich",
      primaryPrice: `${PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY} / Monat`,
      secondaryLine: `abgerechnet als ${PRO_PLAN_ANNUAL_PRICE} / Jahr`,
      subline: "2 Monate geschenkt.",
      bestDealBadge: PRO_PAYWALL_ANNUAL_BEST_DEAL_LABEL,
      discountBadge: PRO_ANNUAL_DISCOUNT_LABEL,
    };
  }
  return {
    title: "Monatlich",
    primaryPrice: `${PRO_PLAN_MONTHLY_PRICE} / Monat`,
    subline: "Monatlich kündbar.",
  };
}

export function proPaywallCtaSubline(interval: ProBillingInterval): string {
  if (interval === "annual") {
    return `${PRO_PLAN_ANNUAL_PRICE} / Jahr · Jederzeit kündbar`;
  }
  return `${PRO_PLAN_MONTHLY_PRICE} / Monat · Jederzeit kündbar`;
}

export const PRO_CHECKOUT_BUTTON_LABEL = "Pro Abo starten";
export const PRO_CHECKOUT_BUTTON_RETURNING_LABEL = `Pro Abo abschließen · ${PRO_PLAN_MONTHLY_PRICE} / Monat`;

export const PRO_NEW_SUBSCRIBER_MONTHLY_LEAD = `${PRO_PLAN_MONTHLY_PRICE} im Monat · voller Pro-Zugang ab Tag 1. Jederzeit kündbar.`;
export const PRO_NEW_SUBSCRIBER_ANNUAL_LEAD = `${PRO_PLAN_ANNUAL_PRICE} pro Jahr · voller Pro-Zugang ab Tag 1. Jederzeit kündbar.`;
export const PRO_ANNUAL_PRICE_COPY = PRO_NEW_SUBSCRIBER_ANNUAL_LEAD;
export const PRO_RETURNING_PRICE_COPY = `Cloud-Abo ${PRO_PLAN_MONTHLY_PRICE} im Monat, Zahlung über Stripe.`;
export const PRO_RETURNING_ANNUAL_PRICE_COPY = `Cloud-Abo ${PRO_PLAN_ANNUAL_PRICE} pro Jahr, Zahlung über Stripe.`;

export const MEMBERSHIP_REQUIRED_MESSAGE =
  "ZeloxTag Pro ist nötig, um diese Funktion zu nutzen. Auf Free bleiben die begrenzten KI-Scans.";

export function cloudAboHref(tagUuid: string): string {
  return `/v/${tagUuid}/abo`;
}

export type ProPlanBenefit = {
  title: string;
  description: string;
};

export const PRO_PLAN_BENEFITS: readonly ProPlanBenefit[] = [
  {
    title: "Schluss mit dem Zettelchaos",
    description:
      "Rechnungen, ABEs und TÜV-Berichte dauerhaft digital gesichert – direkt auf dem Smartphone griffbereit.",
  },
  {
    title: "KI-Belegscan in Sekunden",
    description:
      "Quittung fotografieren, die KI erkennt Teile sowie Preise automatisch und ordnet alles deiner Historie zu.",
  },
  {
    title: "Gutachten-Tresor",
    description:
      "ABEs, Teilegutachten und Einzelabnahmen an einem Ort – durchsuchbar und beim Tuning-Termin sofort parat.",
  },
  {
    title: "Passgenauigkeits-Check",
    description:
      "Schnelle Prüfung, ob Teilegutachten und ABEs formell zu deiner exakten FIN passen, bevor der Prüfer meckert.",
  },
  {
    title: "Service & Ölwechsel im Griff",
    description:
      "Wartungsintervalle, letzte Ölwechsel und Werkstatt-Historie lückenlos – ohne Excel und Zettelwirtschaft.",
  },
  {
    title: "TÜV ohne Stress",
    description:
      "Nächste HU im Dashboard sehen und rechtzeitig handeln, statt erst bei der Polizei daran zu denken.",
  },
  {
    title: "Werkstatt-Direktzugriff",
    description:
      "Gib deiner Werkstatt temporären Upload-Zugriff für Wartungsnachweise – ohne deine Zugangsdaten teilen zu müssen.",
  },
  {
    title: "Showroom & Verkaufs-Exposé",
    description:
      "Präsentiere Umbauten und Specs öffentlich oder als professionelles PDF – ohne sensible Belege zu veröffentlichen.",
  },
  {
    title: "Maximaler Wiederverkaufswert",
    description:
      "Beweise jeden investierten Euro lückenlos. Ein gepflegter digitaler Pass erzielt nachweislich höhere Verkaufspreise.",
  },
] as const;

export type ProCheckoutAudience = "new" | "returning";

export function proIntervalPickerDetail(interval: ProBillingInterval): string {
  return interval === "annual"
    ? PRO_ANNUAL_SAVINGS_COPY
    : "Volle Flexibilität · Monatlich kündbar";
}

export function proIntervalPriceDisplay(interval: ProBillingInterval): {
  primary: string;
  secondary?: string;
} {
  if (interval === "annual") {
    return {
      primary: `${PRO_PLAN_ANNUAL_PRICE} / Jahr`,
      secondary: `(entspricht ${PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY} / Monat)`,
    };
  }
  return {
    primary: `${PRO_PLAN_MONTHLY_PRICE} / Monat`,
    secondary: PRO_MONTHLY_CARD_SUBLINE,
  };
}

export function proIntervalPriceCopy(interval: ProBillingInterval): string {
  return proIntervalPriceDisplay(interval).primary;
}

export function proCheckoutButtonLabel(
  audience: ProCheckoutAudience,
  interval: ProBillingInterval = "annual",
): string {
  if (interval === "annual") {
    return audience === "returning"
      ? `Jahresabo abschließen · ${PRO_PLAN_ANNUAL_PRICE} / Jahr`
      : `Pro starten · ${PRO_PLAN_ANNUAL_PRICE} / Jahr`;
  }
  return audience === "returning"
    ? PRO_CHECKOUT_BUTTON_RETURNING_LABEL
    : `Pro starten · ${PRO_PLAN_MONTHLY_PRICE} / Mo.`;
}

export function proCheckoutMicroCopy(interval: ProBillingInterval): string {
  const monthlyRate =
    interval === "annual"
      ? PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY
      : PRO_PLAN_MONTHLY_PRICE;
  return `Abrechnung ab sofort · ${monthlyRate}/Mo. ${PRO_TRIAL_NO_COMMITMENT}.`;
}

export function proCheckoutPendingLabel(isNativeApp: boolean): string {
  return isNativeApp ? "Kauf wird verarbeitet…" : "Weiter zu Stripe…";
}

export function proCheckoutLead(
  audience: ProCheckoutAudience,
  interval: ProBillingInterval = "annual",
): string {
  if (interval === "annual") {
    return audience === "returning"
      ? PRO_RETURNING_ANNUAL_PRICE_COPY
      : PRO_NEW_SUBSCRIBER_ANNUAL_LEAD;
  }
  return audience === "returning"
    ? PRO_RETURNING_PRICE_COPY
    : PRO_NEW_SUBSCRIBER_MONTHLY_LEAD;
}
