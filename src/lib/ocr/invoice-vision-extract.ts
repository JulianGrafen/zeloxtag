/**
 * LLM-only invoice extraction from a document image.
 *
 * One vision call returns the header, every position and the printed totals.
 * TypeScript then verifies that the positions add up to the printed net; only
 * when that check fails is a single corrective retry issued. No OCR text is
 * sent to the model and no heuristic ever re-pairs a description with an
 * amount — a scan that cannot be verified is returned flagged for review.
 */

import "server-only";

import type OpenAI from "openai";
import { z } from "zod";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildVisionUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  dropNonPositionRows,
  formatEurAmount,
  repairPositionRows,
  verifyInvoiceTotals,
  type InvoicePrintedTotals,
  type InvoiceTotalsVerdict,
} from "@/lib/ocr/invoice-extraction-verify";
import {
  signedInvoiceLineAmount,
  type InvoiceTextParseCategory,
} from "@/lib/ocr/text-parse-schema";
import { validateAndFixLineItems } from "@/services/invoice/InvoiceMathValidator";
import { stripHtmlTags } from "@/lib/ocr/normalize-ocr-markdown";
import type { InvoiceLineItem, InvoiceTotals } from "@/types/invoice";

/** Positions plus header fit well below this; the cap only guards runaways. */
const VISION_MAX_COMPLETION_TOKENS = 2_000;

const VISION_CATEGORIES = [
  "repair",
  "service",
  "tuning",
  "tuev",
  "other",
] as const;

/**
 * One compact rule block. Everything the model needs to avoid the two failure
 * modes we actually see on camera scans: taking Std./Einzelpreis instead of the
 * line total, and pulling an amount from a neighbouring row.
 */
export const INVOICE_VISION_SYSTEM_PROMPT = `Du liest deutsche Kfz-Rechnungen (Werkstatt, Teile, Service) aus Foto oder Scan und gibst strikt JSON zurück.

POSITIONEN
- Arbeite den Positionsbereich Zeile für Zeile von oben nach unten ab. Eine sichtbare Zeile = eine Position.
- total_price = der RECHTESTE Euro-Betrag dieser Zeile (Preis-€ / Ges. Preis / Betrag / Zeilensumme).
- quantity = Menge / Anzahl / Std. / AE dieser Zeile. unit_price = Einzelpreis / E-Preis / Stundensatz. Beide NIEMALS als total_price.
- Zeile ohne Euro-Betrag (Diagnosetext, Hinweis, Umbruch einer Bezeichnung, z. B. "Blau/Rot") ist KEINE Position: Text an die Beschreibung der Zeile darüber anhängen.
- Nie einen Betrag aus einer anderen Zeile übernehmen. Jeder gedruckte Betrag gehört zu genau einer Position.
- Abschnitte (Arbeitswerte/Arbeitszeit, Ersatzteile/Material, Sonstige Kosten/Fremdleistungen) nacheinander abarbeiten. Abschnittstitel und Spaltenköpfe sind keine Positionen.
- Bei Rabatt gilt der gedruckte Betrag nach Rabatt.

SUMMEN (gehören in totals, nie in line_items)
- net_amount = Nettosumme / Netto Summe / Positionssumme
- vat_amount = MwSt.- / USt.-Betrag
- gross_amount = Endpreis / Gesamtbetrag / Rechnungsbetrag / Zahlbetrag
- Zwischensummen, "Gesamt", MwSt.-Zeile und Endpreis sind NIEMALS line_items.

KOPF
- vendor_name = Werkstatt / Händler aus Logo oder Briefkopf.
- invoice_number, invoice_date (YYYY-MM-DD), vehicle.mileage = Kilometerstand als Ganzzahl, vin und license_plate wenn lesbar.
- category: repair, service, tuning, tuev (nur echte HU/AU-Prüfberichte) oder other.

SELBSTKONTROLLE vor der Ausgabe
- Die Summe aller total_price muss net_amount ergeben (ohne gedrucktes Netto: gross_amount minus MwSt.).
- Stimmt sie nicht, prüfe zuerst, ob ein Betrag aus der falschen Zeile stammt oder eine Summenzeile als Position gelandet ist.

Nur gedruckte Werte übernehmen. Nichts rechnen, nichts erfinden. Antwort: ausschließlich JSON.`;

const INVOICE_VISION_USER_LINES = [
  "Deutsche Kfz-Rechnung: Kopf, alle Positionen und die gedruckten Summen extrahieren.",
];

type InvoiceVisionJsonSchema = {
  name: string;
  strict: true;
  schema: Record<string, unknown>;
};

/** Strict Structured-Outputs schema — invoice fields only, no ABE/TÜV fields. */
export const INVOICE_VISION_JSON_SCHEMA: InvoiceVisionJsonSchema = {
  name: "invoice_vision_extract",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "vendor_name",
      "invoice_number",
      "invoice_date",
      "category",
      "vehicle",
      "totals",
      "line_items",
    ],
    properties: {
      vendor_name: { type: ["string", "null"] },
      invoice_number: { type: ["string", "null"] },
      invoice_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
      category: { type: "string", enum: [...VISION_CATEGORIES] },
      vehicle: {
        type: "object",
        additionalProperties: false,
        required: ["vin", "license_plate", "mileage"],
        properties: {
          vin: { type: ["string", "null"] },
          license_plate: { type: ["string", "null"] },
          mileage: { type: ["number", "null"], description: "Kilometerstand" },
        },
      },
      totals: {
        type: "object",
        additionalProperties: false,
        required: ["net_amount", "vat_amount", "gross_amount"],
        properties: {
          net_amount: { type: ["number", "null"] },
          vat_amount: { type: ["number", "null"] },
          gross_amount: { type: ["number", "null"] },
        },
      },
      line_items: {
        type: "array",
        description: "Eine Position pro sichtbarer Zeile mit Euro-Betrag.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["description", "quantity", "unit_price", "total_price"],
          properties: {
            description: { type: "string" },
            quantity: { type: ["number", "null"] },
            unit_price: {
              type: ["number", "null"],
              description: "Einzelpreis / Stundensatz",
            },
            total_price: {
              type: ["number", "null"],
              description: "Rechtester Euro-Betrag der Zeile",
            },
          },
        },
      },
    },
  },
};

const visionResponseSchema = z.object({
  vendor_name: z.string().trim().nullable(),
  invoice_number: z.string().trim().nullable(),
  invoice_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  category: z.enum(VISION_CATEGORIES),
  vehicle: z.object({
    vin: z.string().trim().nullable(),
    license_plate: z.string().trim().nullable(),
    mileage: z.number().finite().nullable(),
  }),
  totals: z.object({
    net_amount: z.number().finite().nullable(),
    vat_amount: z.number().finite().nullable(),
    gross_amount: z.number().finite().nullable(),
  }),
  line_items: z.array(
    z.object({
      description: z.string().trim().min(1),
      quantity: z.number().finite().nullable(),
      unit_price: z.number().finite().nullable(),
      total_price: z.number().finite().nullable(),
    }),
  ),
});

export type InvoiceVisionResponse = z.infer<typeof visionResponseSchema>;

/** Minimal chat surface so tests can inject a fake completion. */
export type InvoiceVisionChatClient = {
  chat: {
    completions: {
      create: (
        body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      ) => Promise<OpenAI.Chat.Completions.ChatCompletion>;
    };
  };
};

export type InvoiceVisionExtractInput = {
  client: InvoiceVisionChatClient;
  model: string;
  /** Already prepared (resized) page image. */
  image: DocumentBytesInput;
  /** Footer totals read from OCR text, used only when the model returns null. */
  ocrTotals?: Partial<InvoicePrintedTotals>;
};

export type InvoiceVisionExtractResult = {
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  category: InvoiceTextParseCategory;
  mileageKm: number | null;
  lineItems: InvoiceLineItem[];
  totals: InvoiceTotals;
  printedTotals: InvoicePrintedTotals;
  verdict: InvoiceTotalsVerdict;
  /** 1 when the first response verified, 2 after a corrective retry. */
  attempts: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sanitizeText(value: string | null): string | null {
  if (value == null) return null;
  const cleaned = stripHtmlTags(value).replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Domain positions from the raw response — rows without a total are notes. */
function toLineItemDrafts(
  raw: InvoiceVisionResponse,
): { description: string; quantity: number; unit_price: number | null; total_price: number }[] {
  return raw.line_items.flatMap((item) => {
    const total =
      item.total_price ??
      (item.quantity != null && item.unit_price != null
        ? roundMoney(item.quantity * item.unit_price)
        : null);
    if (total == null) return [];

    const description = sanitizeText(item.description);
    if (!description) return [];

    return [
      {
        description,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price,
        total_price: signedInvoiceLineAmount(description, total),
      },
    ];
  });
}

function resolvePrintedTotals(
  raw: InvoiceVisionResponse,
  ocrTotals: Partial<InvoicePrintedTotals> | undefined,
): InvoicePrintedTotals {
  return {
    net: raw.totals.net_amount ?? ocrTotals?.net ?? null,
    vat: raw.totals.vat_amount ?? ocrTotals?.vat ?? null,
    gross: raw.totals.gross_amount ?? ocrTotals?.gross ?? null,
  };
}

function resolveGrossAmount(
  printed: InvoicePrintedTotals,
  positionsSum: number | null,
): number {
  if (printed.gross != null) return roundMoney(printed.gross);
  if (printed.net != null && printed.vat != null) {
    return roundMoney(printed.net + printed.vat);
  }
  return roundMoney(printed.net ?? positionsSum ?? 0);
}

function buildAttemptResult(
  raw: InvoiceVisionResponse,
  ocrTotals: Partial<InvoicePrintedTotals> | undefined,
  attempts: number,
): InvoiceVisionExtractResult {
  const printedTotals = resolvePrintedTotals(raw, ocrTotals);
  const positions = validateAndFixLineItems(toLineItemDrafts(raw));
  const lineItems = repairPositionRows(
    dropNonPositionRows(positions),
    printedTotals,
  );
  const verdict = verifyInvoiceTotals(lineItems, printedTotals);

  return {
    vendorName: sanitizeText(raw.vendor_name),
    invoiceNumber: sanitizeText(raw.invoice_number),
    invoiceDate: raw.invoice_date,
    category: raw.category,
    mileageKm:
      raw.vehicle.mileage != null ? Math.round(raw.vehicle.mileage) : null,
    lineItems,
    totals: {
      net_amount: printedTotals.net,
      vat_amount: printedTotals.vat,
      gross_amount: resolveGrossAmount(printedTotals, verdict.positionsSum),
    },
    printedTotals,
    verdict,
    attempts,
  };
}

/** Terse correction so the retry costs one image and a handful of tokens. */
function buildCorrectionLines(previous: InvoiceVisionExtractResult): string[] {
  const lines = [
    "Deine letzte Antwort war nicht schlüssig — lies den Positionsbereich erneut.",
  ];

  if (previous.verdict.issues.includes("position_sum_mismatch")) {
    lines.push(
      `Summe deiner Positionen: ${formatEurAmount(previous.verdict.positionsSum)}, gedruckt: ${formatEurAmount(previous.verdict.expectedTotal)}.`,
    );
  }
  if (previous.verdict.issues.includes("no_positions")) {
    lines.push("Du hast keine Positionen geliefert.");
  }

  lines.push(
    "Pro sichtbarer Zeile genau eine Position; Betrag = rechtester Euro-Wert dieser Zeile.",
    "Zeilen ohne Betrag sind Hinweise (an die Zeile darüber anhängen), Summen- und MwSt.-Zeilen sind keine Positionen.",
  );

  return lines;
}

async function requestVisionExtract(
  input: InvoiceVisionExtractInput,
  extraUserLines: string[],
): Promise<InvoiceVisionResponse> {
  const userContent = await buildVisionUserMessage(
    [...INVOICE_VISION_USER_LINES, ...extraUserLines],
    input.image,
  );

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await input.client.chat.completions.create({
      model: input.model,
      max_completion_tokens: VISION_MAX_COMPLETION_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: INVOICE_VISION_JSON_SCHEMA,
      },
      messages: [
        { role: "system", content: INVOICE_VISION_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LLM request failed.";
    throw new TextParseError(`Invoice parse request failed: ${message}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new TextParseError("Invoice parse returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJsonObject(content);
  } catch {
    throw new TextParseError("Invoice parse returned invalid JSON.");
  }

  const parsed = visionResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new TextParseError(
      `Invoice parse payload failed schema validation: ${parsed.error.issues
        .slice(0, 3)
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }

  return parsed.data;
}

/**
 * Extract an invoice from a page image with one LLM call, plus at most one
 * corrective retry when the positions do not reconcile with the printed net.
 */
export async function extractInvoiceFromImage(
  input: InvoiceVisionExtractInput,
): Promise<InvoiceVisionExtractResult> {
  const first = buildAttemptResult(
    await requestVisionExtract(input, []),
    input.ocrTotals,
    1,
  );
  if (first.verdict.verified) return first;

  // Without a printed total there is nothing a retry could reconcile against.
  if (first.verdict.issues.includes("no_printed_total")) return first;

  let second: InvoiceVisionExtractResult;
  try {
    second = buildAttemptResult(
      await requestVisionExtract(input, buildCorrectionLines(first)),
      input.ocrTotals,
      2,
    );
  } catch (error) {
    console.warn("[invoice-vision-extract] corrective retry failed", error);
    return first;
  }

  if (second.verdict.verified) return second;

  const firstDelta = first.verdict.delta ?? Number.POSITIVE_INFINITY;
  const secondDelta = second.verdict.delta ?? Number.POSITIVE_INFINITY;
  return secondDelta < firstDelta ? second : first;
}
