/**
 * Shared Azure Document Intelligence OCR + domain parse dispatch.
 * Invoice → {@link InvoiceParseService}
 * ABE → {@link AbeParseService}
 */

import { budgetAbeOcrText } from "./abe-from-text";
import { getDocumentIntelligenceEnv } from "./document-intelligence-env";
import { inferInvoiceCategory } from "./infer-invoice-category";
import { isLlmConfigured } from "./llm-client";
import type { DocumentParseKind, OcrJsonPayload } from "./ocr-types";
import { TextParseError } from "./parse-error";
import { abeParseService } from "./services/abe-parse-service";
import { invoiceParseService } from "./services/invoice-parse-service";
import type { InvoiceTextParseResult } from "./text-parse-schema";

export type { DocumentParseKind, OcrJsonPayload } from "./ocr-types";

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

export type AnalyzeDocumentResult = {
  kind: "invoice" | "abe";
  fields: InvoiceTextParseResult;
  rawText: string;
  ocrJson: OcrJsonPayload;
  modelId: string;
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

async function runDocumentOcr(input: {
  bytes: Buffer;
  contentType: string;
}): Promise<OcrJsonPayload> {
  const { endpoint, apiKey, isConfigured } = getDocumentIntelligenceEnv();
  if (!isConfigured) {
    throw new DocumentIntelligenceError(
      "Document Intelligence ist nicht konfiguriert (DOCUMENTINTELLIGENCE_ENDPOINT / DOCUMENTINTELLIGENCE_API_KEY).",
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

  return ocrJson;
}

function resolveParseKind(
  kind: DocumentParseKind | undefined,
  ocrText: string,
): "invoice" | "abe" {
  if (kind === "invoice" || kind === "abe") return kind;
  return inferInvoiceCategory(ocrText) === "abe" ? "abe" : "invoice";
}

/**
 * OCR (Read) → domain parse service (invoice XOR ABE).
 */
export async function analyzeDocument(input: {
  bytes: Buffer;
  contentType: string;
  kind?: DocumentParseKind;
}): Promise<AnalyzeDocumentResult> {
  if (!isLlmConfigured()) {
    throw new DocumentIntelligenceError(
      "LLM API key fehlt (API_KEY) — OCR-JSON-Parse benötigt Foundry/OpenAI.",
    );
  }

  const ocrJson = await runDocumentOcr(input);
  const kind = resolveParseKind(input.kind, ocrJson.text);
  const ocrJsonForApi = JSON.stringify({
    headerLines: ocrJson.headerLines,
    text: ocrJson.text,
    pageCount: ocrJson.pageCount,
  });

  try {
    if (kind === "abe") {
      const abe = await abeParseService.parseFromText(ocrJson.text);
      return {
        kind: "abe",
        fields: abeParseService.toAnalyzeFields(abe, ocrJson.text),
        rawText: ocrJson.text,
        ocrJson,
        modelId: MODEL_ID,
      };
    }

    const parsed = await invoiceParseService.parseFromText(ocrJsonForApi);
    return {
      kind: "invoice",
      fields: invoiceParseService.mergeWithOcr(parsed, ocrJson),
      rawText: ocrJson.text,
      ocrJson,
      modelId: MODEL_ID,
    };
  } catch (error) {
    const message =
      error instanceof TextParseError
        ? error.message
        : error instanceof Error
          ? error.message
          : "LLM parse failed.";
    throw new DocumentIntelligenceError(message);
  }
}

/**
 * @deprecated Prefer {@link analyzeDocument} with `kind: "auto" | "invoice"`.
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
  const result = await analyzeDocument({ ...input, kind: "auto" });
  return {
    fields: result.fields,
    rawText: result.rawText,
    ocrJson: result.ocrJson,
    modelId: result.modelId,
  };
}
