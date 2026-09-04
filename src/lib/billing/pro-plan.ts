/** ZeloxTag Cloud Pro — public checkout copy. */

export const PRO_PLAN_NAME = "ZeloxTag Pro";
export const PRO_PLAN_MONTHLY_PRICE = "4,99 €";
export const PRO_PLAN_ANNUAL_PRICE = "49,99 €";
export const PRO_PLAN_MONTHLY_DAILY_PRICE = "0,16 €";
export const PRO_PLAN_ANNUAL_DAILY_PRICE = "0,14 €";
export const PRO_ANNUAL_RECOMMENDED_LABEL = "Empfohlen";
export const PRO_ANNUAL_SAVINGS_COPY = "Spare 17%!";
export const PRO_TRIAL_DAYS = 14;

export type ProBillingInterval = "monthly" | "annual";

export const PRO_CHECKOUT_BUTTON_LABEL = "14 Tage kostenlos starten";
export const PRO_CHECKOUT_BUTTON_RETURNING_LABEL = `Pro Abo abschließen · ${PRO_PLAN_MONTHLY_PRICE} / Monat`;

export const PRO_TRIAL_HEADLINE = `Die ersten ${PRO_TRIAL_DAYS} Tage sind kostenlos.`;
export const PRO_TRIAL_PRICE_COPY = `Danach ${PRO_PLAN_MONTHLY_PRICE} im Monat, jederzeit kündbar.`;
export const PRO_ANNUAL_TRIAL_PRICE_COPY = `Danach ${PRO_PLAN_ANNUAL_PRICE} pro Jahr, jederzeit kündbar.`;
export const PRO_ANNUAL_PRICE_COPY = PRO_ANNUAL_TRIAL_PRICE_COPY;
export const PRO_TRIAL_CHECKOUT_COPY = `${PRO_TRIAL_HEADLINE} Danach ${PRO_PLAN_MONTHLY_PRICE} im Monat oder ${PRO_PLAN_ANNUAL_PRICE} pro Jahr, jederzeit kündbar.`;
export const PRO_RETURNING_PRICE_COPY = `Cloud-Abo ${PRO_PLAN_MONTHLY_PRICE} im Monat, Zahlung über Stripe.`;
export const PRO_RETURNING_ANNUAL_PRICE_COPY = `Cloud-Abo ${PRO_PLAN_ANNUAL_PRICE} pro Jahr, Zahlung über Stripe.`;

export const MEMBERSHIP_REQUIRED_MESSAGE =
  "ZeloxTag Pro ist nötig, um diese Funktion zu nutzen. Die ersten 14 Tage sind kostenlos.";

export function cloudAboHref(tagUuid: string): string {
  return `/v/${tagUuid}/abo`;
}

export const PRO_PLAN_BENEFITS = [
  "Digitale Fahrzeugakte in der Cloud — Belege, ABEs und TÜV an einem Ort",
  "Belege scannen: ZeloxTag erkennt den Typ und füllt die Felder vor",
  "ABE-Prüfung, ob das Gutachten zu deinem konkreten Fahrzeug passt",
  "Schrauber einladen — die Werkstatt trägt ein, ohne dein Passwort",
  "Lückenlose Historie für Verkauf, Kontrolle und den nächsten Halter",
] as const;

export type ProCheckoutAudience = "new" | "returning";

export function proIntervalDailyPriceCopy(interval: ProBillingInterval): string {
  return interval === "annual"
    ? PRO_PLAN_ANNUAL_DAILY_PRICE
    : PRO_PLAN_MONTHLY_DAILY_PRICE;
}

export function proTrialHint(interval: ProBillingInterval): string {
  return `${proIntervalDailyPriceCopy(interval)} pro Tag · ${PRO_TRIAL_DAYS} Tage kostenlos`;
}

export function proIntervalPriceCopy(interval: ProBillingInterval): string {
  return interval === "annual"
    ? `${PRO_PLAN_ANNUAL_PRICE} / Jahr`
    : `${PRO_PLAN_MONTHLY_PRICE} / Monat`;
}

export function proCheckoutButtonLabel(
  audience: ProCheckoutAudience,
  interval: ProBillingInterval = "monthly",
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

export function proCheckoutLead(
  audience: ProCheckoutAudience,
  interval: ProBillingInterval = "monthly",
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
