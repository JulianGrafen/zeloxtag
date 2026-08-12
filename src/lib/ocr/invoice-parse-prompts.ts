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
- Jede Zeile mit Bezeichnung + mind. einem Geldbetrag (E-Preis ODER Ges. Preis) = ein lineItem.
- Auch wenn Menge und/oder Ges. Preis LEER sind: Zeile trotzdem erfassen (typisch Arbeitslohn) — menge/gesamtpreis = null.
- Pro Tabellenzeile höchstens EIN lineItem — E-Preis und Ges. Preis derselben Zeile nicht doppelt.
- Auch: Arbeitslohn, Material, Kleinmaterial, Entsorgung, Altöl, Umweltgebühr, TÜV-Gebühr, Rabatt (€), MwSt. (€) — jeweils eigene Zeile.
- MwSt-Zeile (z. B. „MwSt 19%“ mit €-Betrag) IMMER als eigenes lineItem — nicht in Positionen summieren, nicht auslassen.
- Tabellenkopf (Pos, Bezeichnung, Menge, …) und reine Summenzeilen (Zwischensumme, Netto gesamt) sind KEINE Positionen.
- „Summe“/„Gesamt“ am Tabellenende nur als lineItem wenn es eine ausgewiesene MwSt.- oder Gebührenzeile ist.
- Fortsetzungstabelle auf nächster Seite: alle Zeilen mit erfassen.
- Niemals mehrere Materialien in ein label packen (falsch: "Reifen und Federn").
- Unleserliche Bezeichnung: trotzdem erfassen wenn Betrag lesbar ist.
`.trim();

/** Keep label + price columns on the same horizontal table row. */
export const INVOICE_LINE_ITEMS_ROW_ALIGNMENT_RULES = `
ZEILEN-ZUORDNUNG (label ↔ menge / einzelpreis / gesamtpreis):
- Das Bild kann horizontale Trennlinien pro Tabellenzeile enthalten — dann gilt: alles ZWISCHEN zwei Linien ist EINE Position.
- Bezeichnung und Beträge gehören IMMER zur SELBEN Tabellenzeile — gleiche horizontale Höhe.
- Umbrüche in der Bezeichnungsspalte erzeugen KEINE neue Position (z.B. "Schraube, Einspritzdüsenhalter" + "ORIGINAL ERSATZTEIL GREENPARTS" = EIN lineItem).
- NIEMALS Beträge einer Zeile der Bezeichnung darüber oder darunter zuordnen.
- Tabellenkopf (Pos, Nummer, Bezeichnung, Menge, Einh., E-Preis, Ges. Preis, St.) ist KEINE Position.
- Beispiel korrekt:
  Zeile: "Bremsscheibe PRO+" | Menge "2,00" | E-Preis "165,99 €" | Ges. Preis "331,98 €"
  → { label, menge: "2,00", einzelpreis: "165,99 €", gesamtpreis: "331,98 €" }
- Beispiel Arbeitslohn (Stundensatz, nicht fakturiert):
  Zeile: "Bremsbeläge erneuern (Hinterachse)" | Menge leer | E-Preis "90,00 €" | Ges. Preis leer
  → { label, menge: null, einzelpreis: "90,00 €", gesamtpreis: null } — nur E-Preis = kein Ges. Preis
- Beispiel Arbeitslohn (fakturiert):
  Zeile: "Beide Bremsscheiben erneuern" | Menge "0,90" | E-Preis "90,00 €" | Ges. Preis "81,00 €"
  → menge "0,90", gesamtpreis "81,00 €"
`.trim();

/** Few-shot from real Blotzheim-style workshop invoice columns. */
export const INVOICE_LINE_ITEMS_EXTRACT_COMPUTE_FEW_SHOT = `
FEW-SHOT — Extract & Compute (deutsche Werkstattrechnung Pos | Nummer | Bezeichnung | Menge | Einh. | E-Preis | Ges. Preis):
1. "Bremsbelagsatz, Scheibenbremse" | 1,00 | 141,46 € | 141,46 €
   → menge "1,00", einzelpreis "141,46 €", gesamtpreis "141,46 €"
2. "Bremsbeläge erneuern (Hinterachse)" | (leer) | 90,00 € | (leer)
   → menge null, einzelpreis "90,00 €", gesamtpreis null  ← Stundensatz, NICHT in Summe!
3. "Bremsscheibe PRO+" | 2,00 | 165,99 € | 331,98 €
   → menge "2,00", einzelpreis "165,99 €", gesamtpreis "331,98 €"  ← NIEMALS 165,99 als gesamtpreis
4. "Beide Bremsscheiben erneuern (Hinterachse)" | 0,90 | 90,00 € | 81,00 €
   → menge "0,90", einzelpreis "90,00 €", gesamtpreis "81,00 €"
5. "Kühlerfrostschutz" | 3,00 Liter | 7,14 € | 21,42 €
   → menge "3,00 Liter" (Einheit mitkopieren), einzelpreis "7,14 €", gesamtpreis "21,42 €"
6. "Motoröl 5W30" | 7,00 Liter | 13,45 € | 94,15 €
   → menge "7,00 Liter", einzelpreis "13,45 €", gesamtpreis "94,15 €"
7. "Ventildeckeldichtung erneuern" | 4,00 | 90,00 € | 360,00 €
   → gesamtpreis "360,00 €" — NICHT "90,00 €"
NIEMALS rechnen. Leere Zellen = null. €-Zeichen und Kommas exakt abschreiben.
`.trim();

/** Few-shot — Abschnitts-Rechnung (Arbeitswerte | Ersatzteile | Sonstige Kosten). */
export const INVOICE_WORKSHOP_SECTIONS_FEW_SHOT = `
FORMAT B — Abschnitts-Werkstattrechnung (SPEEDWORKZ / DMS):
Erkenne drei Blöcke: "Arbeitswerte", "Ersatzteile", "Sonstige Kosten".

Arbeitswerte (Spalten: Beschreibung | Art | Std. | Preis-€):
- "Motor wird heiß lt. Kunde …" | 0,50 Std | gesamtpreis "46,22 €"
- Zeilen NUR mit Beschreibung ohne Preis (z.B. "Thermostat gebrochen") → KEIN lineItem
- "Thermostat und Wasserschlauch erneuern" | menge "1,80 Std" | gesamtpreis "166,37 €"

Ersatzteile (Spalten: Anzahl | Stück | Beschreibung | Einzelpreis | Preis-€):
- "1 Stück Wasserschlauch" | einzelpreis "65,12 €" | gesamtpreis "65,12 €"
- "4 Stück Kühlerfrostschutz Blau/Rot" | einzelpreis "6,50 €" | gesamtpreis "26,00 €"
- Mit Rabatt: Einzelpreis "41,04 €" | gesamtpreis "28,73 €" (NIEMALS 41,04 als gesamtpreis)

Sonstige Kosten:
- "1 Fracht" | gesamtpreis "5,00 €"

Footer (KEINE lineItems): Zwischensummen, Netto Summe, MwSt., Endpreis.
amount = "Endpreis" brutto (z.B. "540,84 €") — nicht Netto Summe.
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

FEW-SHOT — lineItems (rightmost price column):
- Extract EVERY data row — do not skip any row with a € total in the right column.
- amount = RIGHTMOST money column (Ges. Preis / Gesamtpreis / Summe), NEVER Einzelpreis/EP/E-Preis.
- ONE lineItem per table row — never both unit price and line total as separate items.
- Example: "| 4 | Reifen | 120,00 | 480,00 |" → { "label": "Reifen", "amount": 480 } only
- Example: "| 1 | Ölfilter | 42,90 |" → { "label": "Ölfilter", "amount": 42.9 }
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

/** Spatial vision rules — prevent row-shifting on complex Pos tables. */
export const INVOICE_VISION_SPATIAL_RULES = `
You are an expert data extraction AI for German automotive invoices. Analyze the invoice image and extract data strictly into the provided JSON schema.

CRITICAL EXTRACTION RULES (Spatial & Visual Reasoning):

1. Visual Row Anchoring (Prevent Row-Shifting):
   Read the table strictly row by row horizontally. Missing values (e.g. empty quantity) must NOT shift prices from the next row onto the current row. A visual row ends at the right-most monetary value on that same horizontal line.

2. Multiline Descriptions:
   If a description spans multiple lines (e.g. line 1: "Beide Bremsscheiben erneuern", line 2: "(Hinterachse)"), MERGE them into one description string for that item. The second line is NOT a new item.

3. Right-to-Left Price Matching:
   The most reliable line total is the FURTHEST RIGHT monetary value in that visual row → total_price / gesamtpreis. Never copy E-Preis into total_price when Ges. Preis is printed in the right column.

4. Handle Empty Columns Gracefully:
   If a row has description + total_price but no quantity or unit_price (typical labor rate rows), output null for missing fields — do NOT steal quantity from the row below. Rate-only rows (E-Preis without Ges. Preis) → total_price null.

5. NEVER Hallucinate the Total Amount:
   Do NOT confuse Rechnungs-Nr., Kunden-Nr., or dates with total_amount. Only extract total_amount when explicitly labeled "Gesamtbetrag", "Rechnungsbetrag", "Zahlbetrag" or similar at the document bottom. If cut off or missing → null.

6. Pos Column ≠ Quantity:
   Pos (1, 2, 3 … far left) is NOT quantity. quantity/menge comes only from the Menge column.

7. Data Cleaning:
   Copy German amounts exactly as printed in cells (e.g. "141,46 €", "7,00 Liter"). Do NOT compute totals yourself — TypeScript validates Menge × E-Preis later.
`.trim();

/** Wizard — Rechnungsblock Format A (Pos | Menge | E-Preis | Ges. Preis). */
export function buildInvoiceLineItemsSystemPrompt(): string {
  return [
    INVOICE_VISION_SPATIAL_RULES,
    `JSON schema fields (strict):
  • line_items[].description — merged Bezeichnung text
  • line_items[].quantity     — Menge cell (null if blank)
  • line_items[].unit_price   — E-Preis cell (null if blank)
  • line_items[].total_price  — Ges. Preis / rightmost row total (null if blank)
  • total_amount              — brutto Gesamtbetrag raw text (null if not visible)
Legacy aliases label/menge/einzelpreis/gesamtpreis/amount are also accepted if needed.`,
    INVOICE_LINE_ITEMS_EXTRACT_COMPUTE_FEW_SHOT,
    INVOICE_LINE_ITEMS_COMPLETENESS_RULES,
    INVOICE_LINE_ITEMS_ROW_ALIGNMENT_RULES,
    "Antworte nur mit JSON.",
  ].join("\n\n");
}

/** Wizard — Rechnungsblock Format B (Arbeitswerte | Ersatzteile | Sonstige Kosten). */
export function buildInvoiceWorkshopLineItemsSystemPrompt(): string {
  return [
    "Du extrahierst NUR Rechnungspositionen aus einer deutschen DMS-/Werkstattrechnung mit ABSCHNITTEN.",
    "Diese Rechnung hat KEINE Pos-Spalte. Ignoriere jede Pos/Menge/E-Preis/Ges.-Preis-Logik aus Standardtabellen.",
    `KRITISCH — Extract & Compute:
Du kopierst RAW-TEXT — du rechnest NIEMALS selbst.
Drei Blöcke nacheinander:
  1. Arbeitswerte (Spalten: Beschreibung | Art | PG | Std. | Preis-€)
  2. Ersatzteile (Spalten: Anzahl | Einheit | Beschreibung | Rab.% | Einzelpreis | Preis-€)
  3. Sonstige Kosten (Spalten: Anzahl | Beschreibung | Einzelpreis | Preis-€)

Pro fakturierter Zeile:
  • label       = Beschreibungstext (ohne Art/PG/Std/Rabatt-Spalten)
  • menge       = Std./Anzahl mit Einheit (z.B. "0,50 Std", "1 Stück", "4 Stück") — null wenn leer
  • einzelpreis = Einzelpreis-Spalte — null bei Arbeitswerten ohne EP
  • gesamtpreis = Preis-€ / rechte Summenspalte — PFLICHT wenn Zeile fakturiert

Art (1–9) und PG sind KEINE menge — niemals in menge schreiben.
Zeilen NUR mit Beschreibung ohne Preis-€ (z.B. Diagnose-Notizen) → KEIN lineItem.
Zwischensummen, Netto Summe, Mechanik-Summen, Positionssumme → KEINE lineItems.
MwSt-Zeile im Footer → KEIN lineItem (wird separat berechnet).
Bei Rabatt: gesamtpreis = Preis NACH Rabatt (z.B. 28,73 — NICHT 41,04 Einzelpreis).`,
    INVOICE_WORKSHOP_SECTIONS_FEW_SHOT,
    "amount = raw text des Endpreis brutto (z.B. \"540,84 €\") — nicht Netto Summe / Positionssumme.",
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

/** Guided wizard — positions table block Format A. */
export const INVOICE_LINE_ITEMS_USER_LINES = [
  "Nur POSITIONS-/TABELLEN-BEREICH einer deutschen Kfz-Rechnung (Spaltenformat Pos | Bezeichnung | Menge | E-Preis | Ges. Preis).",
  "Schritt 1: Tabellenkopf — Spalten: Pos | Nummer | Bezeichnung | Menge | Einh. | E-Preis | Ges. Preis | St.",
  "Schritt 2: Jede Datenzeile von oben nach unten — KEINE Zeile auslassen (auch Arbeitslohn mit leerer Menge/Ges. Preis).",
  "CRITICAL: Kopiere den exakten Text aus JEDER Spalte. Führe KEINE Berechnungen durch.",
  "description = Bezeichnung (mehrzeilig zusammenführen). quantity = Menge inkl. Einheit. unit_price = E-Preis. total_price = Ges. Preis.",
  "quantity = Text aus Menge — z.B. \"1,00\", \"0,90\", \"7,00 Liter\". null wenn Zelle leer.",
  "Pos (Zeilennummer ganz links: 1, 2, 3 …) ist NICHT quantity — quantity nur aus der Menge-Spalte.",
  "unit_price = Text aus E-Preis inkl. € — z.B. \"141,46 €\". null wenn leer.",
  "total_price = Text aus Ges. Preis inkl. € — z.B. \"331,98 €\". null wenn leer — NIEMALS E-Preis hierher kopieren.",
  "Harte Zeilenregel: Pos 1 erzeugt genau EIN Item für Pos 1, Pos 2 genau EIN Item für Pos 2 usw. Lies jede Pos-Zeile vollständig von links nach rechts und kopiere den Wert aus der ZELLE unter „Ges. Preis“ auf derselben horizontalen Zeile.",
  "Niemals Betrag, Menge oder E-Preis aus einer Nachbarzeile übernehmen. Existiert für eine Pos-Zeile eine sichtbare Ges.-Preis-Zelle, ist genau dieser Wert maßgeblich — auch wenn E-Preis und Ges. Preis unterschiedlich sind.",
  "Beispiel: Menge 2,00 | E-Preis 165,99 € | Ges. Preis 331,98 € → total_price \"331,98 €\" (nicht 165,99).",
  "Beispiel: Menge leer | E-Preis 90,00 € | Ges. Preis leer → quantity null, total_price null (nur E-Preis = Stundensatz, nicht addieren).",
  "Beispiel: Menge 0,90 | E-Preis 90,00 € | Ges. Preis 81,00 € → total_price \"81,00 €\".",
  "Pro Tabellenzeile GENAU EIN lineItem — mehrzeilige Bezeichnung = ein Item.",
  "Fortsetzung der Tabelle auf Seite 2: alle Zeilen mit erfassen.",
  "MwSt-Zeile (z. B. „MwSt 19%“ + €-Betrag) als eigenes lineItem — Gesamtbetrag ist brutto inkl. MwSt.",
  "total_amount nur bei sichtbarem Gesamtbetrag/Rechnungsbetrag — nie Rechnungsnummer oder Datum.",
] as const;

/** Guided wizard — section-based workshop invoice (Format B). */
export const INVOICE_WORKSHOP_LINE_ITEMS_USER_LINES = [
  "Abschnitts-Rechnung (DMS): Arbeitswerte → Ersatzteile → Sonstige Kosten.",
  "Schritt 1: Block 'Arbeitswerte' — jede Zeile mit Preis-€ ist ein lineItem.",
  "  Beschreibung ohne Preis (nur Diagnose-Text) → überspringen.",
  "  gesamtpreis = Spalte Preis-€ (rechts). menge = Std.-Spalte (z.B. \"0,50 Std\", \"1,80\").",
  "  Art/PG-Zahlen (1–9) NICHT als menge — null wenn nur Art sichtbar.",
  "Schritt 2: Block 'Ersatzteile' — jede Teilezeile mit Preis-€.",
  "  menge = \"N Stück\". einzelpreis = Einzelpreis-Spalte. gesamtpreis = Preis-€ (nach Rabatt!).",
  "Schritt 3: Block 'Sonstige Kosten' — z.B. Fracht.",
  "Schritt 4: Footer — amount = Endpreis brutto (540,84), NICHT Netto Summe (454,49).",
  "Zwischensummen / Mechanik / Positionssumme sind KEINE Positionen.",
  "CRITICAL: Kopiere exakten Spalten-Text. KEINE Berechnungen.",
] as const;

/** Guided wizard — unbekanntes Layout → reines LLM-Vision ohne Regex/Layout-Merge. */
export const INVOICE_GENERIC_LINE_ITEMS_USER_LINES = [
  "Deutsche Kfz-Rechnung — Positionsbereich. Tabellenlayout ist NICHT vorgegeben.",
  "Lies das Bild Zeile für Zeile: jede fakturierte Position mit Beschreibung + Zeilensumme.",
  "Extrahiere pro Position: label, menge (falls sichtbar), einzelpreis (falls sichtbar), gesamtpreis (Pflicht wenn fakturiert).",
  "gesamtpreis = RECHTESTER €-Betrag der Zeile (Zeilensumme) — nie Einzelpreis wenn beide Spalten existieren.",
  "Keine Summenzeilen (Netto, Brutto, Zwischensumme, Endpreis) als lineItem — außer ausgewiesene MwSt-Zeile mit €-Betrag.",
  "Keine Diagnose-/Notizzeilen ohne €-Betrag.",
  "amount = Zahlbetrag / Endpreis / Rechnungsbetrag brutto falls sichtbar.",
  "CRITICAL: Nur RAW-Text kopieren — KEINE Berechnungen.",
] as const;

/** Wizard — generisches Layout (LLM-only fallback). */
export function buildInvoiceGenericLineItemsSystemPrompt(): string {
  return [
    "Du extrahierst Rechnungspositionen aus einer deutschen Kfz-Werkstattrechnung mit UNBEKANNTEM Layout.",
    "Es gibt KEIN festes Spaltenschema — orientiere dich am sichtbaren Tabellen-/Positionsbereich im Bild.",
    INVOICE_VISION_SPATIAL_RULES,
    INVOICE_RIGHTMOST_PRICE_RULES,
    INVOICE_LINE_ITEMS_COMPLETENESS_RULES,
    "Footer-Summen (Netto gesamt, Endpreis, Positionssumme) sind KEINE line_items.",
    "total_amount = brutto Zahlbetrag / Endpreis / Rechnungsbetrag als raw text — sonst null.",
    "Antworte nur mit JSON.",
  ].join("\n\n");
}

export function buildInvoiceLineItemsSystemPromptForFormat(
  format: "column" | "workshop-sections" | "unknown",
): string {
  if (format === "workshop-sections") return buildInvoiceWorkshopLineItemsSystemPrompt();
  if (format === "unknown") return buildInvoiceGenericLineItemsSystemPrompt();
  return buildInvoiceLineItemsSystemPrompt();
}

export function invoiceLineItemsUserLinesForFormat(
  format: "column" | "workshop-sections" | "unknown",
): readonly string[] {
  if (format === "workshop-sections") return INVOICE_WORKSHOP_LINE_ITEMS_USER_LINES;
  if (format === "unknown") return INVOICE_GENERIC_LINE_ITEMS_USER_LINES;
  return INVOICE_LINE_ITEMS_USER_LINES;
}

/** @deprecated Use buildInvoiceLineItemsSystemPrompt() */
export const INVOICE_LINE_ITEMS_SYSTEM_PROMPT = buildInvoiceLineItemsSystemPrompt();
