import { PRO_PLAN_MONTHLY_PRICE } from "@/lib/billing/pro-plan";

export const FUEL_SCAN_PAYWALL_COPY = {
  headline: "Mach Schluss mit Zettelwirtschaft.",
  subline:
    "Deine 3 Test-Scans sind aufgebraucht. Sichere dir lückenlose Betriebskosten für deinen Build mit Zelox Pro.",
  priceLine: `${PRO_PLAN_MONTHLY_PRICE} / Monat – monatlich kündbar`,
  primaryCta: "Jetzt Pro freischalten",
  secondaryCta: "Weiterhin manuell eintragen",
  benefits: [
    {
      id: "unlimited-scans",
      label: "Unbegrenzte KI-Scans für Tanken, Service & Rechnungen",
    },
    {
      id: "expose",
      label: "1-Klick-Verkaufsexposé & lückenlose Wertehistorie",
    },
    {
      id: "multi-garage",
      label: "Multi-Garage für alle deine Fahrzeuge",
    },
  ],
} as const;

export function fuelScanQuotaBadgeLabel(
  remaining: number,
  total: number,
): string {
  return `${remaining} von ${total} Test-Scans übrig`;
}
