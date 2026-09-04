/** ZeloxTag Cloud Pro — public checkout copy. */

export const PRO_PLAN_NAME = "ZeloxTag Pro";
export const PRO_PLAN_MONTHLY_PRICE = "4,99 €";
export const PRO_PLAN_MONTHLY_DAILY_PRICE = "0,16 €";
export const PRO_PLAN_ANNUAL_PRICE = "49,90 €";
export const PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY = "4,16 €";
export const PRO_ANNUAL_RECOMMENDED_LABEL = "Beliebteste Wahl";
export const PRO_ANNUAL_SAVINGS_COPY =
  "2 Monate geschenkt (Spare 10 € gegenüber Monatszahlung)";
export const PRO_TRIAL_DAYS = 14;
export const PRO_TRIAL_LABEL = "14 Tage kostenlos testen";

export type ProBillingInterval = "monthly" | "annual";

export const PRO_PLAN_CHECKOUT_HEADLINE =
  "Hol das Maximum aus deinem Fahrzeug.";
export const PRO_PLAN_CHECKOUT_SUBLINE =
  "Teste ZeloxTag Pro 14 Tage kostenlos. Voller Zugriff, jederzeit mit 1 Klick kündbar.";

/** Paywall modal — progress endowment framing */
export const PRO_PAYWALL_PROGRESS_PERCENT = 80;
export const PRO_PAYWALL_PROGRESS_LABEL = "Fahrzeugpass zu 80 % eingerichtet";
export const PRO_PAYWALL_MODAL_SUBLINE =
  "Sichere dir dauerhaften Cloud-Speicher für alle Umbauten und lade deinen Fahrzeugpass direkt ins Smartphone-Wallet.";
export const PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER =
  "Dein Gratis-Scan ist verbraucht";
export const PRO_PAYWALL_STICKY_MICROCOPY =
  "Erst nach Ablauf der 14 Tage zahlbar. Keine Mindestvertragslaufzeit – Kündigung jederzeit im Account mit 1 Klick.";
export const PRO_MONTHLY_CARD_SUBLINE = "Monatlich kündbar · Volle Flexibilität";
export const PRO_ANNUAL_CARD_HIGHLIGHT = `entspricht ${PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY} / Monat (2 Monate geschenkt)`;

export const PRO_PAYWALL_MODAL_BENEFITS = [
  "Kein Zettelchaos mehr: Alle ABEs, Rechnungen und TÜV-Berichte griffbereit bei jeder Polizeikontrolle.",
  "KI-Belegscan: Erkennt Preise, Teile und Prüfnummern automatisch in Sekunden.",
  "Apple & Google Wallet: Digitaler Fahrzeugpass direkt auf dem Homescreen.",
  "Maximaler Wiederverkaufswert: Lückenlose Dokumentation für den nächsten Halter.",
] as const;

export type ProPaywallTimelineIcon = "check" | "mail" | "shield";

export type ProPaywallTimelineNode = {
  icon: ProPaywallTimelineIcon;
  text: string;
};

export const PRO_PAYWALL_TRIAL_TIMELINE: readonly ProPaywallTimelineNode[] = [
  {
    icon: "check",
    text: "Heute: 14 Tage kostenloser Pro-Zugriff (0,00 €)",
  },
  {
    icon: "mail",
    text: "Tag 12: Erinnerungs-E-Mail vor Ende der Testphase",
  },
  {
    icon: "shield",
    text: "Tag 14: Erstmalige Abrechnung – jederzeit mit 1 Klick kündbar",
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
    title: "Passgenauigkeits-Check",
    description:
      "Schnelle Prüfung, ob Teilegutachten und ABEs formell zu deiner exakten FIN passen, bevor der Prüfer meckert.",
  },
  {
    title: "Werkstatt-Direktzugriff",
    description:
      "Gib deiner Werkstatt temporären Upload-Zugriff für Wartungsnachweise – ohne deine Zugangsdaten teilen zu müssen.",
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
    secondary: `${PRO_PLAN_MONTHLY_DAILY_PRICE} pro Tag`,
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
  return `Erst nach ${PRO_TRIAL_DAYS} Tagen ${monthlyRate}/Mo. Keine Fristen, Kündigung jederzeit im Profil mit einem Klick.`;
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
