/**
 * Azure Document Intelligence OCR for TÜV hybrid extraction.
 * Vision LLM handles metadata/costs; OCR text feeds Punkt-6 / KM heuristics.
 */

import { getDocumentIntelligenceEnv } from "./document-intelligence-env";
import { normalizeOcrMarkdown } from "./normalize-ocr-markdown";
import type { OcrJsonPayload } from "./ocr-types";

const API_VERSION = "2024-11-30";
const MODEL_ID = "prebuilt-layout";
const LOCALE = "de-DE";
const POLL_INTERVAL_MS = 700;
const POLL_TIMEOUT_MS = 60_000;
const MAX_OCR_TEXT_CHARS = 48_000;

export class AzureDocumentOcrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AzureDocumentOcrError";
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildAnalyzeUrl(endpoint: string): string {
  const params = new URLSearchParams({
    "api-version": API_VERSION,
    locale: LOCALE,
    outputContentFormat: "markdown",
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
  try {
    return await fetch(buildAnalyzeUrl(input.endpoint), {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": input.apiKey,
        "Content-Type": input.contentType || "application/octet-stream",
      },
      body: new Uint8Array(input.bytes),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Netzwerkfehler.";
    throw new AzureDocumentOcrError(
      `Dokumentanalyse nicht erreichbar: ${message}`,
    );
  }
}

async function pollAnalyzeResult(
  operationLocation: string,
  apiKey: string,
): Promise<DiAnalyzeResult> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    let pollResponse: Response;
    try {
      pollResponse = await fetch(operationLocation, {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Netzwerkfehler.";
      throw new AzureDocumentOcrError(
        `Dokumentanalyse nicht erreichbar: ${message}`,
      );
    }

    if (!pollResponse.ok) {
      void (await pollResponse.text().catch(() => ""));
      throw new AzureDocumentOcrError(
        `Dokumentanalyse fehlgeschlagen (${pollResponse.status}).`,
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
      throw new AzureDocumentOcrError(
        payload.error?.message || "Dokumentanalyse fehlgeschlagen.",
      );
    }
  }

  throw new AzureDocumentOcrError(
    "Analyse dauert zu lange — bitte erneut versuchen.",
  );
}

/** Prefer Azure Markdown `content`; fall back to line OCR. */
export function buildOcrJsonPayload(result: DiAnalyzeResult): OcrJsonPayload {
  const markdown = (result.content ?? "").trim();
  const pages = result.pages ?? [];

  const rawPageBodies = pages.map((page) =>
    (page.lines ?? [])
      .map((line) => line.content?.trim())
      .filter((value): value is string => Boolean(value))
      .join("\n"),
  );

  const pageBlocks = rawPageBodies.map((body, index) => {
    if (!body) return "";
    if (pages.length <= 1) return body;
    return `--- Seite ${pages[index]?.pageNumber ?? index + 1} ---\n${body}`;
  });

  let plainFallback = pageBlocks.filter(Boolean).join("\n\n").trim();
  if (plainFallback.length < 8) {
    plainFallback = (result.paragraphs ?? [])
      .map((paragraph) => paragraph.content?.trim())
      .filter((value): value is string => Boolean(value))
      .join("\n")
      .trim();
  }

  const useMarkdown = markdown.length >= 8;
  const text = normalizeOcrMarkdown(useMarkdown ? markdown : plainFallback);

  const firstPageLines = (pages[0]?.lines ?? [])
    .map((line) => line.content?.trim())
    .filter((value): value is string => Boolean(value));

  return {
    modelId: MODEL_ID,
    locale: LOCALE,
    pageCount: Math.max(1, pages.length || 1),
    text: text.slice(0, MAX_OCR_TEXT_CHARS),
    coverText: rawPageBodies[0]?.slice(0, MAX_OCR_TEXT_CHARS) ?? "",
    headerLines: firstPageLines.slice(0, 12),
    contentFormat: useMarkdown ? "markdown" : "text",
  };
}

export async function runDocumentOcr(input: {
  bytes: Buffer;
  contentType: string;
}): Promise<OcrJsonPayload> {
  const { endpoint, apiKey, isConfigured } = getDocumentIntelligenceEnv();
  if (!isConfigured) {
    throw new AzureDocumentOcrError(
      "Dokumentanalyse ist nicht konfiguriert.",
    );
  }

  const startResponse = await startAnalyze({
    endpoint,
    apiKey,
    bytes: input.bytes,
    contentType: input.contentType,
  });

  if (!startResponse.ok) {
    void (await startResponse.text().catch(() => ""));
    throw new AzureDocumentOcrError(
      `Dokumentanalyse fehlgeschlagen (${startResponse.status}).`,
    );
  }

  const operationLocation = startResponse.headers.get("operation-location");
  if (!operationLocation) {
    throw new AzureDocumentOcrError(
      "Dokumentanalyse konnte nicht gestartet werden.",
    );
  }

  const analyzeResult = await pollAnalyzeResult(operationLocation, apiKey);
  const ocrJson = buildOcrJsonPayload(analyzeResult);

  if (ocrJson.text.length < 8) {
    throw new AzureDocumentOcrError(
      "Zu wenig Text erkannt. Bitte schärferes, gut ausgeleuchtetes Foto versuchen.",
    );
  }

  return ocrJson;
}

export function buildFullOcrPlainText(payload: OcrJsonPayload): string {
  const headerBlob = payload.headerLines.join("\n");
  return `${headerBlob}\n${payload.text}`.trim();
}

/**
 * TÜV-only OCR — returns null when Azure DI is unavailable or fails
 * so vision LLM parsing can continue without blocking upload.
 */
export async function runTuevDocumentOcr(input: {
  bytes: Buffer;
  contentType: string;
}): Promise<OcrJsonPayload | null> {
  const { isConfigured } = getDocumentIntelligenceEnv();
  if (!isConfigured) return null;

  try {
    return await runDocumentOcr(input);
  } catch (error) {
    console.warn(
      "[runTuevDocumentOcr] OCR fallback to vision-only:",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}
