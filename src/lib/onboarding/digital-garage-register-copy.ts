/** Copy for PWA / digital-garage registration (parity with claim intro). */

import {
  FREE_AI_ABE_SCAN_LIMIT,
  FREE_AI_INVOICE_SCAN_LIMIT,
} from "@/lib/billing/free-scan-constants";

export const DIGITAL_GARAGE_REGISTER_HEADLINE =
  "Deine digitale Garage — ohne Tag im Motorraum.";

export const DIGITAL_GARAGE_REGISTER_LEAD =
  "Konto anlegen, Fahrzeug eintragen, Belege und Historie verwalten. Den V4A-Tag kannst du später verknüpfen oder bestellen.";

/** Register intro — Stichpunkte unter Headline & Lead. */
export const DIGITAL_GARAGE_REGISTER_USPS = [
  `Gratis: ${FREE_AI_INVOICE_SCAN_LIMIT}× Rechnung & ${FREE_AI_ABE_SCAN_LIMIT}× ABE per KI scannen`,
  "ABEs, Belege & TÜV — lückenlose Fahrzeugakte",
  "Öffentliche Build-Visitenkarte — ohne sensible Belege",
  "V4A-QR-Tag optional — später verknüpfen oder bestellen",
] as const;

export const DIGITAL_GARAGE_REGISTER_STEPS = [
  "Konto mit Google oder E-Mail",
  "Marke, Modell, Baujahr",
  "Sofort ins Fahrzeug-Dashboard",
] as const;

export const DIGITAL_GARAGE_POST_SIGNUP_HINT =
  "Mit Google geht es sofort weiter. Bei E-Mail & Passwort bestätigst du zuerst dein Postfach.";
