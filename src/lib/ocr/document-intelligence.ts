/**
 * Low-cost scan pipeline:
 * 1) Azure Document Intelligence `prebuilt-read` (OCR only, ~$1.50 / 1k pages)
 * 2) Compact OCR JSON → Foundry LLM for structured invoice fields
 *
 * Target: well under 1 cent per single-page scan (no invoice model, no add-ons, no vision).
 */

import {
  budgetAbeOcrText,
  extractAbeConditionsFromText,
  preferAbeConditions,
  preferAbeManufacturer,
  resolveAbeFields,
} from "./abe-from-text";
import { extractInvoiceFromText, TextParseError } from "./extract-from-text";
import { getDocumentIntelligenceEnv } from "./document-intelligence-env";
import { inferInvoiceCategory } from "./infer-invoice-category";
import {
  extractInvoiceLineItemsFromText,
  preferInvoiceLineItems,
} from "./invoice-line-items-from-text";
import { preferMileageKm } from "./mileage-from-text";
import { isLlmConfigured } from "./llm-client";
import { resolveAbePartName } from "./part-from-text";
import {
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "./text-parse-schema";
import { resolveVendorName } from "./vendor-from-text";

const API_VERSION = "2024-11-30";
/** Cheapest DI model suitable for full-page OCR. */
const MODEL_ID = "prebuilt-read";
const LOCALE = "de-DE";
const POLL_INTERVAL_MS = 700;
const POLL_TIMEOUT_MS = 60_000;
/**
 * Multi-page ABEs often exceed 10k chars before Auflagen appear.
 * Budget keeps head metadata + Auflagen (see budgetAbeOcrText).
 */
const MAX_OCR_TEXT_CHARS = 48_000;

export class DocumentIntelligenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentIntelligenceError";
  }
}

type DiLine = {
  content?: string;
};

type DiPage = {
  pageNumber?: number;
  lines?: DiLine[];
};

type DiParagraph = {
  content?: string;
};

type DiAnalyzeResult = {
  content?: string;
  pages?: DiPage[];
  paragraphs?: DiParagraph[];
};

/** Compact OCR payload sent to the Foundry parse API. */
export type OcrJsonPayload = {
  modelId: string;
  locale: string;
  pageCount: number;
  /** Full reading-order text (primary input for the LLM). */
  text: string;
  /** First-page header lines — often contain logo / workshop name. */
  headerLines: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildAnalyzeUrl(endpoint: string): string {
  const params = new URLSearchParams({
    "api-version": API_VERSION,
    locale: LOCALE,
  });
  return (
    `${endpoint}documentintelligence/documentModels/${MODEL_ID}:analyze` +
    `?${params.toString()}`
  );
}

async function startAnalyze(input: {
  endpoint: string;
  apiKey: string;
  bytes: Buffer;
  contentType: string;
}): Promise<Response> {
  return fetch(buildAnalyzeUrl(input.endpoint), {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": input.apiKey,
      "Content-Type": input.contentType || "application/octet-stream",
    },
    body: new Uint8Array(input.bytes),
  });
}

async function pollAnalyzeResult(
  operationLocation: string,
  apiKey: string,
): Promise<DiAnalyzeResult> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    const pollResponse = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    });

    if (!pollResponse.ok) {
      const detail = (await pollResponse.text()).slice(0, 400);
      throw new DocumentIntelligenceError(
        `Document Intelligence poll failed (${pollResponse.status}): ${detail}`,
      );
    }

    const payload = (await pollResponse.json()) as {
      status?: string;
      analyzeResult?: DiAnalyzeResult;
      error?: { message?: string };
    };

    if (payload.status === "succeeded" && payload.analyzeResult) {
      return payload.analyzeResult;
    }

    if (payload.status === "failed") {
      throw new DocumentIntelligenceError(
        payload.error?.message || "Document Intelligence Analyse fehlgeschlagen.",
      );
    }
  }

  throw new DocumentIntelligenceError(
    "Document Intelligence Timeout — bitte erneut versuchen.",
  );
}

/**
 * Build a compact OCR JSON document from Read results.
 */
export function buildOcrJsonPayload(result: DiAnalyzeResult): OcrJsonPayload {
  const pages = result.pages ?? [];
  const pageBlocks = pages.map((page, index) => {
    const lines = (page.lines ?? [])
      .map((line) => line.content?.trim())
      .filter((value): value is string => Boolean(value));
    const body = lines.join("\n");
    if (pages.length <= 1) return body;
    return `--- Seite ${page.pageNumber ?? index + 1} ---\n${body}`;
  });

  let text = pageBlocks.filter(Boolean).join("\n\n").trim();
  if (text.length < 8) {
    text = (result.content ?? "").trim();
  }
  if (text.length < 8) {
    text = (result.paragraphs ?? [])
      .map((paragraph) => paragraph.content?.trim())
      .filter((value): value is string => Boolean(value))
      .join("\n")
      .trim();
  }

  const firstPageLines = (pages[0]?.lines ?? [])
    .map((line) => line.content?.trim())
    .filter((value): value is string => Boolean(value));

  return {
    modelId: MODEL_ID,
    locale: LOCALE,
    pageCount: Math.max(1, pages.length || 1),
    text: budgetAbeOcrText(text, MAX_OCR_TEXT_CHARS),
    headerLines: firstPageLines.slice(0, 12),
  };
}

function mergeParsedFields(
  parsed: InvoiceTextParseResult,
  ocr: OcrJsonPayload,
): InvoiceTextParseResult {
  const headerBlob = ocr.headerLines.join("\n");
  const fullText = `${headerBlob}\n${ocr.text}`;

  const categorySeed = `${fullText}\n${parsed.summary ?? ""}\n${parsed.vendor ?? ""}`;
  const scored = inferInvoiceCategory(categorySeed);
  // Heuristic wins over LLM for ABE — parts invoices often say "inkl. ABE".
  let category: InvoiceTextParseResult["category"];
  if (scored === "abe") {
    category = "abe";
  } else if (parsed.category === "abe") {
    category = scored;
  } else if (scored !== "other") {
    category = scored;
  } else if (parsed.category !== "other") {
    category = parsed.category;
  } else {
    category = "other";
  }

  // ABE: vendor field holds Bauteil (Marke + Art), not workshop name.
  const vendor =
    category === "abe"
      ? resolveAbePartName({
          structuredPart: parsed.vendor,
          rawText: fullText,
        })
      : resolveVendorName({
          structuredVendor: parsed.vendor,
          logoCandidates: ocr.headerLines.slice(0, 4),
          rawText: fullText,
        });

  const summary =
    category === "abe" && vendor && !parsed.summary
      ? vendor.slice(0, 80)
      : parsed.summary;

  const abeFields =
    category === "abe"
      ? resolveAbeFields({
          structuredKba: parsed.kbaNumber,
          structuredApprovals: parsed.vehicleApprovals,
          rawText: fullText,
        })
      : { kbaNumber: null, vehicleApprovals: null };

  const heuristicLineItems =
    category === "abe" ? null : extractInvoiceLineItemsFromText(fullText);

  return normalizeTextParseResult({
    ...parsed,
    vendor,
    category,
    summary,
    kbaNumber: abeFields.kbaNumber,
    vehicleApprovals: abeFields.vehicleApprovals,
    lineItems:
      category === "abe"
        ? null
        : preferInvoiceLineItems(parsed.lineItems, heuristicLineItems),
    authority: category === "abe" ? parsed.authority : null,
    conditions:
      category === "abe"
        ? preferAbeConditions(
            parsed.conditions,
            extractAbeConditionsFromText(fullText),
          )
        : null,
    partCategory: category === "abe" ? parsed.partCategory : null,
    notes: category === "abe" ? parsed.notes : null,
    manufacturer:
      category === "abe"
        ? preferAbeManufacturer(parsed.manufacturer, fullText)
        : null,
    invoiceNumber: category === "abe" ? null : parsed.invoiceNumber,
    mileageKm:
      category === "abe" ? null : preferMileageKm(parsed.mileageKm, fullText),
  });
}

/**
 * OCR (Read) → OCR JSON → Foundry structured parse.
 */
export async function analyzeInvoiceDocument(input: {
  bytes: Buffer;
  contentType: string;
}): Promise<{
  fields: InvoiceTextParseResult;
  rawText: string;
  ocrJson: OcrJsonPayload;
  modelId: string;
}> {
  const { endpoint, apiKey, isConfigured } = getDocumentIntelligenceEnv();
  if (!isConfigured) {
    throw new DocumentIntelligenceError(
      "Document Intelligence ist nicht konfiguriert (DOCUMENTINTELLIGENCE_ENDPOINT / DOCUMENTINTELLIGENCE_API_KEY).",
    );
  }

  if (!isLlmConfigured()) {
    throw new DocumentIntelligenceError(
      "LLM API key fehlt (API_KEY) — OCR-JSON-Parse benötigt Foundry/OpenAI.",
    );
  }

  const startResponse = await startAnalyze({
    endpoint,
    apiKey,
    bytes: input.bytes,
    contentType: input.contentType,
  });

  if (!startResponse.ok) {
    const detail = (await startResponse.text()).slice(0, 400);
    throw new DocumentIntelligenceError(
      `Document Intelligence start failed (${startResponse.status}): ${detail}`,
    );
  }

  const operationLocation = startResponse.headers.get("operation-location");
  if (!operationLocation) {
    throw new DocumentIntelligenceError(
      "Document Intelligence lieferte keine operation-location.",
    );
  }

  const analyzeResult = await pollAnalyzeResult(operationLocation, apiKey);
  const ocrJson = buildOcrJsonPayload(analyzeResult);

  if (ocrJson.text.length < 8) {
    throw new DocumentIntelligenceError(
      "Zu wenig Text erkannt. Bitte schärferes, gut ausgeleuchtetes Foto versuchen.",
    );
  }

  // Compact JSON string is what we conceptually "send to the API".
  const ocrJsonForApi = JSON.stringify({
    headerLines: ocrJson.headerLines,
    text: ocrJson.text,
    pageCount: ocrJson.pageCount,
  });

  let parsed: InvoiceTextParseResult;
  try {
    parsed = await extractInvoiceFromText(ocrJsonForApi);
  } catch (error) {
    const message =
      error instanceof TextParseError
        ? error.message
        : error instanceof Error
          ? error.message
          : "LLM parse failed.";
    throw new DocumentIntelligenceError(message);
  }

  const fields = mergeParsedFields(parsed, ocrJson);

  return {
    fields,
    rawText: ocrJson.text,
    ocrJson,
    modelId: MODEL_ID,
  };
}
