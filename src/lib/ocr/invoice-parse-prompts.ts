/**
 * Invoice-only prompts. ABE extraction uses `abe-parse-prompts.ts`.
 */

/** Spalten-Regel: nur Gesamtpreis / rechte Summenspalte — nie Einzelpreis. */
export const INVOICE_RIGHTMOST_PRICE_RULES = `
PREIS-SPALTE (PFLICHT für amount und lineItems.amount):
1. Identifiziere zuerst die Tabellenkopf-Zeile (Pos | Bezeichnung | Menge | Einzelpreis | Ges. Preis | …).
2. amount = NUR der Wert aus der RECHTSTEN Geldbetrags-Spalte pro Zeile.
3. Bevorzugte Spaltenüberschriften (von rechts nach links suchen):
   "Ges. Preis", "Gesamtpreis", "Ges. Summe", "Gesamtbetrag", "Summe", "Betrag", "EUR", "Wert", "Total", "GP", "G-Preis", "Brutto".
4. NIEMALS verwenden: "Einzelpreis", "EP", "Stückpreis", "Stk.", "Netto", "E-Preis", "E Preis", "Listenpreis", "VK", "Rabatt %", "MwSt %".
5. Pro Tabellenzeile GENAU EIN lineItem — niemals Einzelpreis UND Ges. Preis als zwei separate Positionen.
6. Beispiel Zeile: Menge 4 | Einzelpreis 120,00 | Ges. Preis 480,00 → amount = 480 (NICHT 120).
7. Beispiel Zeile: nur eine Geldbetrags-Spalte ganz rechts → genau diesen Wert nehmen.
8. Steht in einer Zeile mehr als ein €-Betrag, IMMER den RECHTSTEN nehmen (Zeilensumme).
9. Rechnungs-Gesamtbetrag (amount): nur "Zahlbetrag", "Rechnungsbetrag", "Gesamtbetrag", "Summe brutto", "Endbetrag" — nie Netto wenn Brutto/Zahlbetrag sichtbar.
`.trim();

/** Menge × E-Preis = Ges. Preis — Pflicht-Rechenlogik für lineItems.amount. */
export const INVOICE_QTY_UNIT_TOTAL_RULES = `
MENGE × E-PREIS = GES. PREIS (PFLICHT für lineItems.amount):
1. Tabellenkopf lesen: Bezeichnung | Menge/Einheit | E-Preis/Einzelpreis | Ges. Preis/Gesamtpreis.
2. lineItems.amount = IMMER der Gesamtpreis / Zeilensumme — NIE der Einzelpreis allein (außer Menge fehlt und nur ein Preis sichtbar).
3. Rechenregel: Menge × E-Preis = Ges. Preis. Diese Formel ist die Prüfsumme.
4. Beispiel: Menge 4 | E-Preis 120,00 | Ges. Preis 480,00 → amount = 480 (4 × 120).
5. Beispiel: Menge 1 | E-Preis 95,00 | Ges. Preis 95,00 → amount = 95.
6. Ist die Ges.-Spalte leer oder unleserlich: amount = Menge × E-Preis berechnen.
7. Ist Menge/Einheit leer: amount = Ges. Preis; wenn auch Ges. Preis fehlt → E-Preis übernehmen.
8. Stehen E-Preis und Ges. Preis in einer Zeile: Ges. Preis hat Vorrang — aber er MUSS ≈ Menge × E-Preis sein.
9. Wenn du nur einen Wert siehst und Menge fehlt: diesen Wert als amount nehmen (typisch Einzelposition).
`.trim();

/** Kilometerstand — Kopf der Rechnung, häufige LLM-Fehler vermeiden. */
export const INVOICE_HEADER_MILEAGE_RULES = `
KILOMETERSTAND (mileageKm) — nur aus explizitem KM-Feld im Kopf:
- Synonyme: Kilometerstand, km-Stand, KM-Stand, Km-Stand, Tachostand, Laufleistung, "bei km", "aktueller km".
- Format: ganze Zahl ohne Tausenderpunkte — "145.000 km" → 145000, "67.210" → 67210, "142350 km" → 142350.
- NIEMALS als mileageKm: Rechnungsnummer, Telefon, PLZ, USt-IdNr, FIN/VIN, Beträge (€), Prozent, Positionsnummern.
- NIEMALS Dezimal-km: 142,35 oder 142.35 ist KEIN Kilometerstand → null.
- Steht kein explizites KM-Feld im Kopf → mileageKm: null (nicht raten).
- Typische Kopfzeile: "KM-Stand: 142.350 km" neben Kennzeichen / Kundennummer / Datum.
`.trim();

/** Vollständigkeit — keine Positionen auslassen. */
export const INVOICE_LINE_ITEMS_COMPLETENESS_RULES = `
VOLLSTÄNDIGKEIT (lineItems):
- Gehe JEDE sichtbare Datenzeile der Positionstabelle von oben nach unten durch — ohne Auslassen.
- Jede Zeile mit Bezeichnung + Geldbetrag in der rechten Summenspalte = ein lineItem.
- Pro Tabellenzeile höchstens EIN lineItem — E-Preis und Ges. Preis derselben Zeile nicht doppelt.
- Auch: Arbeitslohn, Material, Kleinmaterial, Entsorgung, Altöl, Umweltgebühr, Rabatt (€), MwSt. (€) — jeweils eigene Zeile.
- Tabellenkopf (Pos, Bezeichnung, Menge, …) und reine Summenzeilen (Zwischensumme, Netto gesamt) sind KEINE Positionen.
- "Summe"/"Gesamt" am Tabellenende nur als lineItem wenn es eine ausgewiesene MwSt.- oder Gebührenzeile ist.
- Fortsetzungstabelle auf nächster Seite: alle Zeilen mit erfassen.
- Niemals mehrere Materialien in ein label packen (falsch: "Reifen und Federn").
- Unleserliche Bezeichnung: trotzdem erfassen wenn Betrag in rechter Spalte lesbar ist.
`.trim();

/** Keep label + Ges. Preis on the same horizontal table row. */
export const INVOICE_LINE_ITEMS_ROW_ALIGNMENT_RULES = `
ZEILEN-ZUORDNUNG (label ↔ amount):
- Das Bild kann horizontale Trennlinien pro Tabellenzeile enthalten — dann gilt: alles ZWISCHEN zwei Linien ist EINE Position.
- Bezeichnung und Ges. Preis gehören IMMER zur SELBEN Tabellenzeile — gleiche horizontale Höhe.
- Umbrüche in der Bezeichnungsspalte erzeugen KEINE neue Position — der Betrag bleibt bei der Zeile, in der er rechts steht.
- NIEMALS den Betrag einer Zeile der Bezeichnung darüber oder darunter zuordnen (typischer Fehler bei mehrzeiligen Bezeichnungen).
- Tabellenkopf (Pos, Bezeichnung, Menge, …) ist KEINE Position — den ersten Datenbetrag nicht dem Kopf zuordnen.
- Beispiel korrekt:
  Zeile 1: "Sportfedern H&R" … 480,00 → { label: "Sportfedern H&R", amount: 480 }
  Zeile 2: "Arbeitslohn" … 120,00 → { label: "Arbeitslohn", amount: 120 }
- Beispiel falsch: "Arbeitslohn" mit 480,00 weil der Betrag visuell über der Zeile steht.
`.trim();

/** Fallback system prompt when Foundry agent metadata is unavailable. */
export const INVOICE_SYSTEM_PROMPT = `Du bist ein präziser Parser für Kfz-Rechnungen und Servicebelege.
Der OCR-Input ist Markdown (inkl. Tabellen). Nutze Tabellenzeilen und Überschriften als Struktur.
Extrahiere strikt JSON. Wenn ein Wert nicht auffindbar ist, setze ihn auf null.

Schema:
{
  "vendor": "string | null",
  "date": "YYYY-MM-DD | null",
  "amount": "number | null",
  "category": "tuning | service | tuev | repair | other",
  "summary": "3-6 Wörter | null",
  "lineItems": [{ "label": "string", "amount": number }] | null,
  "kbaNumber": null,
  "vehicleApprovals": null,
  "authority": null,
  "conditions": null,
  "partCategory": null,
  "notes": "string | null",
  "manufacturer": null,
  "invoiceNumber": "string | null",
  "mileageKm": "number | null"
}

Regeln:
- vendor = Werkstatt-/Händlername
- invoiceNumber = Beleg-/Rechnungsnummer (z.B. RE-2026-0312)
- mileageKm = Kilometerstand als GANZE Zahl (Integer km), Tausenderpunkte entfernen
- lineItems = JEDE Tabellen-/Positionszeile einzeln — nichts überspringen
  amount = NUR Ges. Preis / Gesamtpreis / rechte Summenspalte — NIE Einzelpreis/EP/Stückpreis
- Prozentwerte sind KEINE Euro-Beträge
- ABE-Felder IMMER null — niemals category=abe

Keine Erklärungen, nur JSON.`;

/**
 * Few-shot block injected for invoice parses (mileage + Markdown table rows).
 */
export const INVOICE_FEW_SHOT_PROMPT = `
FEW-SHOT — mileageKm:
- Synonyms: Laufleistung, Kilometerstand, km-Stand, Tachostand, KM-Stand.
- "145.000 km" → 145000 | "67.210" → 67210 | never invoice # or € amounts
- If no explicit km field → null

FEW-SHOT — lineItems (Gesamtpreis via Menge × E-Preis):
- Extract EVERY data row — do not skip any row with a € total in the right column.
- amount = Gesamtpreis = Menge × E-Preis (validate against Ges.-Spalte when visible).
- NEVER return Einzelpreis when Menge > 1 and Ges. Preis = Menge × E-Preis.
- Example: "| 4 | Reifen | 120,00 | 480,00 |" → { "label": "Reifen", "amount": 480 } (4×120)
- Example: "| 1 | Ölfilter | 42,90 |" → { "label": "Ölfilter", "amount": 42.9 }
- ONE lineItem per table row — never both unit price and line total as separate items.
- Never merge rows. MwSt. as separate row when € amount visible.
`.trim();

/** Few-shot block for HU/AU header mileage (Kopf / Seite 1). */
export const TUEV_HEADER_MILEAGE_FEW_SHOT = `
FEW-SHOT — mileageKm (HU/AU Dokumentkopf / Header):
- Kilometerstand steht im Kopf des Dokuments (obere Seite 1), oft neben Kennzeichen, Fahrgestellnummer, Prüfdatum.
- Synonyme: "KM-Stand", "Km-Stand", "Kilometerstand", "km-Stand", "Tachostand", "Laufleistung".
- Beispiel Kopf: "KM-Stand: 142.350 km" → mileageKm: 142350
- Beispiel Kopf: "Kilometerstand 142350" → mileageKm: 142350
- Beispiel Kopf: "km-Stand 67.210" → mileageKm: 67210
- Tausenderpunkte/Leerzeichen entfernen; ganze Zahl zurückgeben. Wenn nicht lesbar → null
`.trim();

/** Vision LLM user instructions for HU/AU Prüfberichte (costs + metadata). */
export const TUEV_COST_USER_PROMPT_LINES = [
  "Deutsches HU/AU-Prüfprotokoll (TÜV, DEKRA, GTÜ, KÜS).",
  "Lies zuerst den Dokumentkopf (Kopf / Header oben auf Seite 1): Kennzeichen, Fahrgestellnummer, KM-Stand, Prüfdatum.",
  "Extrahiere Prüfgebühren / Kosten als amount (Gesamtbetrag in EUR).",
  "lineItems = einzelne Posten (HU, AU, Abgasuntersuchung, Gebühren) wenn ausgewiesen.",
  "vendor = Prüfstelle / Filiale; invoiceNumber = Vorgangs-/Belegnummer wenn vorhanden.",
  "mileageKm PFLICHT aus dem Kopf/Header wenn KM-Stand / Kilometerstand / km-Stand / Tachostand lesbar.",
  "date = Untersuchungsdatum (YYYY-MM-DD).",
  "category immer tuev. ABE-Felder (kbaNumber, conditions, …) IMMER null.",
  "Nur echte €-Summen — keine Prozentwerte als amount.",
] as const;

/** Per-request user instructions appended before OCR Markdown. */
export const INVOICE_USER_PROMPT_LINES = [
  "Nachfolgend OCR-MARKDOWN einer Kfz-RECHNUNG / eines Servicebelegs",
  "amount + lineItems.amount = NUR Ges. Preis / rechte Summenspalte — NIE Einzelpreis.",
  "Jede Positionstabelle-Zeile einzeln — nichts überspringen.",
  "mileageKm nur bei explizitem KM-Feld im Kopf — sonst null.",
] as const;

/** System prompt used for invoice LLM calls (base + few-shot). */
export function buildInvoiceSystemPrompt(base = INVOICE_SYSTEM_PROMPT): string {
  return [
    base,
    INVOICE_FEW_SHOT_PROMPT,
    INVOICE_QTY_UNIT_TOTAL_RULES,
    INVOICE_RIGHTMOST_PRICE_RULES,
  ].join("\n\n");
}

/** System prompt for HU/AU cost/metadata vision parse (header mileage emphasis). */
export function buildTuevCostSystemPrompt(base = INVOICE_SYSTEM_PROMPT): string {
  return `${buildInvoiceSystemPrompt(base)}\n\n${TUEV_HEADER_MILEAGE_FEW_SHOT}`;
}

/** Wizard — Rechnungskopf (KM, Belegnr., Datum). */
export function buildInvoiceHeaderSystemPrompt(): string {
  return [
    "Du extrahierst NUR den Rechnungs-KOPF (oberer Bereich) einer deutschen Kfz-Werkstattrechnung.",
    "Felder: vendor, invoiceNumber, date, mileageKm.",
    "Keine Positionstabelle — keine lineItems.",
    "Optional → null wenn nicht lesbar. Nicht raten.",
    INVOICE_HEADER_MILEAGE_RULES,
  ].join("\n\n");
}

/** Wizard — Positionsblock (dedizierter LLM-Pass). */
export function buildInvoiceLineItemsSystemPrompt(): string {
  return [
    "Du extrahierst NUR Rechnungspositionen aus dem Tabellen-/Positionsbereich einer deutschen Kfz-Werkstattrechnung.",
    "Deine einzige Aufgabe: lineItems vollständig erfassen + amount (Zahlbetrag falls sichtbar).",
    INVOICE_QTY_UNIT_TOTAL_RULES,
    INVOICE_RIGHTMOST_PRICE_RULES,
    INVOICE_LINE_ITEMS_COMPLETENESS_RULES,
    INVOICE_LINE_ITEMS_ROW_ALIGNMENT_RULES,
    "Antworte nur mit JSON.",
  ].join("\n\n");
}

/** Guided wizard — full document overview (metadata, not line-item table). */
export const INVOICE_OVERVIEW_USER_LINES = [
  "Deutsche Kfz-Rechnung — GESAMTDOKUMENT.",
  "Extrahiere nur: vendor, date, amount, category, summary.",
  "amount = Zahlbetrag / Rechnungsbetrag / Gesamtbetrag brutto — nie Netto wenn Brutto sichtbar.",
  "Keine Positionsliste — kommt aus separatem Scan.",
] as const;

/** Guided wizard — document header band. */
export const INVOICE_HEADER_USER_LINES = [
  "Nur OBERER BEREICH (Kopf): Werkstattname, Belegnummer, Rechnungsdatum, Kilometerstand.",
  "mileageKm NUR wenn explizit KM-Stand / Kilometerstand / Laufleistung / Tachostand im Kopf steht.",
  "Keine Rechnungsnummer, Telefon oder €-Beträge als mileageKm.",
  "145.000 km → 145000 (Integer, Tausenderpunkte entfernen).",
] as const;

/** Guided wizard — positions table block (dedicated LLM pass). */
export const INVOICE_LINE_ITEMS_USER_LINES = [
  "Nur POSITIONS-/TABELLEN-BEREICH — jede sichtbare Datenzeile ein lineItem.",
  "Schritt 1: Tabellenkopf — Spalten Menge/Einheit, E-Preis, Ges. Preis identifizieren.",
  "Schritt 2: Pro Zeile Gesamtpreis = Menge × E-Preis (Ges.-Spalte als Prüfsumme).",
  "Schritt 3: Zeile für Zeile von oben nach unten — KEINE Zeile mit Zeilensumme auslassen.",
  "amount pro lineItem = NUR Gesamtpreis — berechnet via Menge × E-Preis wenn nötig.",
  "NIEMALS Einzelpreis zurückgeben wenn Menge × E-Preis den Ges. Preis ergibt.",
  "Menge leer → Ges. Preis; sonst E-Preis wenn nur ein Betrag sichtbar.",
  "Pro Tabellenzeile GENAU EIN lineItem — nicht Einzelpreis und Ges. Preis getrennt listen.",
  "Bezeichnung und Betrag müssen zur gleichen Tabellenzeile gehören.",
  "Fortsetzung der Tabelle (Seite 2): alle Zeilen mit erfassen.",
] as const;

/** @deprecated Use buildInvoiceLineItemsSystemPrompt() */
export const INVOICE_LINE_ITEMS_SYSTEM_PROMPT = buildInvoiceLineItemsSystemPrompt();
