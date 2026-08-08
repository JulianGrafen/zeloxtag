/**
 * Azure Document Intelligence (Layout) — REST client.
 * Sends contrast-enhanced page images for better table OCR.
 */

import { getDocumentIntelligenceEnv } from "./document-intelligence-env";
import type { OcrJsonPayload } from "./ocr-types";

const ANALYZE_API_VERSION = "2024-11-30";
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 55_000;

export type AzureLayoutTableCell = {
  kind?: string;
  rowIndex: number;
  columnIndex: number;
  rowSpan?: number;
  columnSpan?: number;
  content: string;
};

export type AzureLayoutTable = {
  rowCount: number;
  columnCount: number;
  cells: AzureLayoutTableCell[];
};

export type AzureLayoutPageLine = {
  content: string;
};

export type AzureLayoutPage = {
  pageNumber: number;
  lines?: AzureLayoutPageLine[];
};

export type AzureLayoutAnalyzeResult = {
  content: string;
  pages: AzureLayoutPage[];
  tables: AzureLayoutTable[];
};

type AnalyzeOperationBody = {
  status: string;
  analyzeResult?: AzureLayoutAnalyzeResult;
  error?: { message?: string };
};

function buildAnalyzeUrl(endpoint: string): string {
  const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;
  return (
    `${base}documentintelligence/documentModels/prebuilt-layout:analyze` +
    `?api-version=${ANALYZE_API_VERSION}&outputContentFormat=markdown`
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeForAzure(contentType: string): string {
  if (contentType === "application/pdf") return "application/pdf";
  if (contentType === "image/png") return "image/png";
  return "image/jpeg";
}

/**
 * Run prebuilt-layout on document bytes (prefer enhanced PNG from prepare-document-for-llm).
 */
export async function analyzeLayoutWithAzure(
  bytes: Buffer,
  contentType: string,
): Promise<AzureLayoutAnalyzeResult | null> {
  const { endpoint, apiKey, isConfigured } = getDocumentIntelligenceEnv();
  if (!isConfigured || bytes.byteLength < 32) {
    return null;
  }

  const analyzeUrl = buildAnalyzeUrl(endpoint);
  const startedAt = Date.now();

  let operationUrl: string;
  try {
    const response = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": mimeForAzure(contentType),
      },
      body: new Uint8Array(bytes),
    });

    if (response.status === 404) {
      console.warn(
        "[azure-di] prebuilt-layout endpoint not found — check DOCUMENTINTELLIGENCE_ENDPOINT",
      );
      return null;
    }

    if (response.status !== 202) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[azure-di] analyze failed (${response.status})`,
        detail.slice(0, 240),
      );
      return null;
    }

    operationUrl = response.headers.get("operation-location") ?? "";
    if (!operationUrl) {
      console.warn("[azure-di] missing operation-location header");
      return null;
    }
  } catch (error) {
    console.warn("[azure-di] analyze request failed", error);
    return null;
  }

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const poll = await fetch(operationUrl, {
        headers: { "Ocp-Apim-Subscription-Key": apiKey },
      });

      if (!poll.ok) {
        console.warn(`[azure-di] poll failed (${poll.status})`);
        return null;
      }

      const body = (await poll.json()) as AnalyzeOperationBody;
      if (body.status === "failed") {
        console.warn("[azure-di] analysis failed", body.error?.message);
        return null;
      }

      if (body.status !== "succeeded" || !body.analyzeResult) {
        continue;
      }

      return {
        content: body.analyzeResult.content?.trim() ?? "",
        pages: body.analyzeResult.pages ?? [],
        tables: body.analyzeResult.tables ?? [],
      };
    } catch (error) {
      console.warn("[azure-di] poll error", error);
      return null;
    }
  }

  console.warn("[azure-di] analysis timed out");
  return null;
}

export function buildOcrPayloadFromAzureLayout(
  result: AzureLayoutAnalyzeResult,
): OcrJsonPayload {
  const headerLines =
    result.pages[0]?.lines
      ?.map((line) => line.content.trim())
      .filter(Boolean)
      .slice(0, 12) ?? [];

  return {
    modelId: "azure-prebuilt-layout",
    locale: "de-DE",
    pageCount: Math.max(1, result.pages.length),
    text: result.content,
    coverText: result.content.slice(0, 4_000),
    headerLines,
    contentFormat: "markdown",
  };
}

export function isAzureDocumentIntelligenceConfigured(): boolean {
  return getDocumentIntelligenceEnv().isConfigured;
}
