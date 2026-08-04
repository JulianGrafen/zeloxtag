/**
 * Invoice-only prompts. ABE extraction uses `abe-parse-prompts.ts`.
 */

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
- mileageKm = Kilometerstand als ganze Zahl ohne Tausenderpunkte (z.B. 145000)
- lineItems = JEDE Tabellen-/Positionszeile einzeln (Material, Arbeitslohn, MwSt.)
  Niemals Materialien zusammenfassen (falsch: "Reifen und Sportfedern")
  amount = immer Gesamtpreis/Zeilensumme (Menge×Einzelpreis), NIE der Einzelpreis
- Ölwechsel: category=service, summary mit 'Ölwechsel', mileageKm wenn vorhanden
- TÜV/HU: category=tuev; lineItems oft null
- ABE-Felder IMMER null — niemals category=abe

Keine Erklärungen, nur JSON.`;

/**
 * Few-shot block injected for invoice parses (mileage + Markdown table rows).
 * Appended to the system prompt so the model keeps high attention on these fields.
 */
export const INVOICE_FEW_SHOT_PROMPT = `
FEW-SHOT — mileageKm:
- Search synonyms: "Laufleistung", "Kilometerstand", "km-Stand", "Tachostand", "km".
- Strip thousand separators; return an integer.
- Example: Text "Laufleistung: 145.000 km" → mileageKm: 145000
- Example: Text "km-Stand 67.210" → mileageKm: 67210
- If absent → mileageKm: null

FEW-SHOT — lineItems (Markdown / HTML tables):
- You are reading OCR Markdown. Extract EVERY billable row individually.
- Do NOT group materials into one label.
- amount = row total (qty × unit). Never the unit price alone.
- Example Markdown row: "| 4x | Reifen | 120,00 |"
  → { "label": "Reifen", "amount": 480 }
- Example: "| 1 | Arbeitslohn Ölwechsel | 89,00 |"
  → { "label": "Arbeitslohn Ölwechsel", "amount": 89 }
- Example: "| 1 | Motoröl 5W-30 | 198,50 |" and "| 1 | Ölfilter | 42,90 |"
  → two separate lineItems, never one merged row
- Keep MwSt. as its own lineItem when present.
`.trim();

/** Per-request user instructions appended before OCR Markdown. */
export const INVOICE_USER_PROMPT_LINES = [
  "Nachfolgend OCR-MARKDOWN einer Kfz-RECHNUNG / eines Servicebelegs",
  "(Azure Document Intelligence, outputContentFormat=markdown).",
  "Extrahiere nur Rechnungsfelder gemäß Schema.",
  "vendor, invoiceNumber, amount, lineItems, mileageKm, date, category, summary.",
  "ABE-Felder (kbaNumber, conditions, manufacturer, …) IMMER null.",
  "category niemals 'abe'. Erlaubt: tuning | service | tuev | repair | other.",
  "Lies Markdown-Tabellen zeilenweise — jede Position als eigenes lineItem.",
  "mileageKm PFLICHT wenn Laufleistung / km-Stand / Tachostand / … km lesbar.",
  "Ölwechsel/Motoröl/Ölfilter → category=service.",
  "Bei TÜV/HU: category=tuev; lineItems = null wenn keine Positionen.",
] as const;

/** System prompt used for invoice LLM calls (base + few-shot). */
export function buildInvoiceSystemPrompt(base = INVOICE_SYSTEM_PROMPT): string {
  return `${base}\n\n${INVOICE_FEW_SHOT_PROMPT}`;
}
