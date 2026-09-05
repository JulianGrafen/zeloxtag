/** ZeloxTag Cloud Pro — public checkout copy. */

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
export const PRO_TRIAL_DAYS = 14;
export const PRO_TRIAL_LABEL = "14 Tage kostenlos testen";
export const PRO_TRIAL_BADGE_LABEL = "14 Tage kostenlos";
export const PRO_TRIAL_NO_COMMITMENT =
  "Keine Verpflichtung · Jederzeit kündbar";

export function proWeeklyPriceCopy(price: string): string {
  return `${price} pro Woche`;
}

export type ProBillingInterval = "monthly" | "annual";

export const PRO_PLAN_CHECKOUT_HEADLINE =
  "Hol das Maximum aus deinem Fahrzeug.";
export const PRO_SETTINGS_PAYWALL_HEADLINE =
  "Aktiviere ZeloxTag Pro für dein Fahrzeug.";
export const PRO_SETTINGS_PAYWALL_KICKER = "Mitgliedschaft";
export const PRO_PLAN_CHECKOUT_SUBLINE =
  "Teste ZeloxTag Pro 14 Tage kostenlos. Voller Zugriff, jederzeit mit 1 Klick kündbar.";

/** Paywall modal — progress endowment framing */
export const PRO_PAYWALL_PROGRESS_PERCENT = 80;
export const PRO_PAYWALL_PROGRESS_LABEL = "Fahrzeugpass zu 80 % eingerichtet";
export const PRO_PAYWALL_MODAL_SUBLINE =
  "14 Tage kostenlos — Cloud-Speicher, digitaler Fahrzeugpass und lückenlose Projektdokumentation.";
export const PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER =
  "Dein Gratis-Scan ist verbraucht";
export const PRO_PAYWALL_STICKY_MICROCOPY = PRO_TRIAL_NO_COMMITMENT;
export const PRO_PAYWALL_MODAL_MICROCOPY = "Jederzeit kündbar";
export const PRO_PAYWALL_DISMISS_LABEL = "Weiter mit ZeloxTag Free";
export const PRO_MONTHLY_CARD_SUBLINE = "Jederzeit kündbar";
export const PRO_ANNUAL_CARD_HIGHLIGHT = `Entspricht ${PRO_PLAN_ANNUAL_WEEKLY_PRICE} pro Woche (2 Monate geschenkt)`;

export const PRO_PAYWALL_MODAL_BENEFITS = [
  "Endlose KI-Scans: Rechnungen, ABEs & Gutachten in Sekunden verarbeitet",
  "Digitale Akte: Nie wieder Zettelchaos – alles griffbereit an einem Ort",
  "Gutachten-Tresor: ABEs, Teilegutachten & Einzelabnahmen sicher archiviert",
  "Service & Ölwechsel: Intervalle, Werkstatt-Historie und Fälligkeiten im Blick",
  "TÜV-Erinnerung: HU-Termine rechtzeitig sehen – ohne Kalender-Chaos",
  "Maximaler Werterhalt: Beweise die Qualität der Umbauten beim späteren Verkauf",
  "QR-Fahrzeugpass: Präsentiere deine Specs per Scan auf jedem Tuning-Treffen",
  "Öffentlicher Showroom: Teile dein Projekt – ohne sensible Belege preiszugeben",
  "Verkaufs-Exposé: Professionelles PDF für Käufer in wenigen Klicks",
  "Werkstatt-Zugang: Schrauber laden Belege hoch – ohne dein Passwort",
] as const;

export type ProPaywallPricingAnchor = {
  referencePrice?: string;
  currentPrice: string;
  monthlyEquivalent?: string;
  flexSubline?: string;
  trialLabel: string;
};

export function proPaywallPricingAnchor(
  interval: ProBillingInterval,
): ProPaywallPricingAnchor {
  if (interval === "annual") {
    return {
      referencePrice: `${PRO_PLAN_ANNUAL_REFERENCE_PRICE} / Jahr`,
      currentPrice: `${PRO_PLAN_ANNUAL_PRICE} / Jahr`,
      monthlyEquivalent: PRO_ANNUAL_CARD_HIGHLIGHT,
      trialLabel: PRO_TRIAL_LABEL,
    };
  }
  return {
    currentPrice: `${PRO_PLAN_MONTHLY_PRICE} / Monat`,
    flexSubline: PRO_MONTHLY_CARD_SUBLINE,
    trialLabel: PRO_TRIAL_LABEL,
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
    text: "Heute: 14 Tage Pro gratis (0,00 €)",
  },
  {
    icon: "mail",
    text: "Tag 12: Erinnerungs-Mail vor Testende",
  },
  {
    icon: "shield",
    text: "Tag 14: Erstmalige Abrechnung · vorher jederzeit mit 1 Klick kündbar",
  },
] as const;

export const PRO_CHECKOUT_BUTTON_LABEL = PRO_TRIAL_LABEL;
export const PRO_CHECKOUT_BUTTON_RETURNING_LABEL = `Pro Abo abschließen · ${PRO_PLAN_MONTHLY_PRICE} / Monat`;

export const PRO_TRIAL_HEADLINE = `Die ersten ${PRO_TRIAL_DAYS} Tage sind kostenlos.`;
export const PRO_TRIAL_PRICE_COPY = `Danach ${PRO_PLAN_MONTHLY_PRICE} im Monat, jederzeit kündbar.`;
export const PRO_ANNUAL_TRIAL_PRICE_COPY = `Danach ${PRO_PLAN_ANNUAL_PRICE} pro Jahr, jederzeit kündbar.`;
export const PRO_ANNUAL_PRICE_COPY = PRO_ANNUAL_TRIAL_PRICE_COPY;
export const PRO_TRIAL_CHECKOUT_COPY = PRO_PLAN_CHECKOUT_SUBLINE;
export const PRO_RETURNING_PRICE_COPY = `Cloud-Abo ${PRO_PLAN_MONTHLY_PRICE} im Monat, Zahlung über Stripe.`;
export const PRO_RETURNING_ANNUAL_PRICE_COPY = `Cloud-Abo ${PRO_PLAN_ANNUAL_PRICE} pro Jahr, Zahlung über Stripe.`;

export const MEMBERSHIP_REQUIRED_MESSAGE =
  "ZeloxTag Pro ist nötig, um diese Funktion zu nutzen. Die ersten 14 Tage sind kostenlos.";

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
      : PRO_CHECKOUT_BUTTON_LABEL;
  }
  return audience === "returning"
    ? PRO_CHECKOUT_BUTTON_RETURNING_LABEL
    : PRO_CHECKOUT_BUTTON_LABEL;
}

export function proCheckoutMicroCopy(interval: ProBillingInterval): string {
  const monthlyRate =
    interval === "annual"
      ? PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY
      : PRO_PLAN_MONTHLY_PRICE;
  return `Erst nach ${PRO_TRIAL_DAYS} Tagen ${monthlyRate}/Mo. ${PRO_TRIAL_NO_COMMITMENT}.`;
}

export function proCheckoutLead(
  audience: ProCheckoutAudience,
  interval: ProBillingInterval = "annual",
): string {
  if (interval === "annual") {
    return audience === "returning"
      ? PRO_RETURNING_ANNUAL_PRICE_COPY
      : `${PRO_TRIAL_HEADLINE} ${PRO_ANNUAL_TRIAL_PRICE_COPY}`;
  }
  return audience === "returning"
    ? PRO_RETURNING_PRICE_COPY
    : `${PRO_TRIAL_HEADLINE} ${PRO_TRIAL_PRICE_COPY}`;
}
