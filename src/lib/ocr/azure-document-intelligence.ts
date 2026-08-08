/**
 * Azure Document Intelligence (Layout) — REST client.
 * Sends contrast-enhanced page images for better table OCR.
 */

import { getDocumentIntelligenceEnv } from "./document-intelligence-env";
import type { OcrJsonPayload } from "./ocr-types";

function parsePolygon(raw: unknown): AzurePolygon | undefined {
  if (!Array.isArray(raw)) return undefined;
  const polygon = raw.filter((value): value is number => typeof value === "number");
  return polygon.length >= 4 ? polygon : undefined;
}

function parseBoundingRegions(raw: unknown): AzureLayoutBoundingRegion[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const regions: AzureLayoutBoundingRegion[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const pageNumber =
      typeof record.pageNumber === "number" ? record.pageNumber : null;
    const polygon = parsePolygon(record.polygon);
    if (pageNumber == null || !polygon) continue;
    regions.push({ pageNumber, polygon });
  }

  return regions.length > 0 ? regions : undefined;
}

function parseAnalyzeResult(raw: unknown): AzureLayoutAnalyzeResult {
  const result = (raw ?? {}) as Record<string, unknown>;

  const pagesRaw = Array.isArray(result.pages) ? result.pages : [];
  const pages: AzureLayoutPage[] = pagesRaw.map((pageRaw, index) => {
    const page = (pageRaw ?? {}) as Record<string, unknown>;
    const linesRaw = Array.isArray(page.lines) ? page.lines : [];
    return {
      pageNumber:
        typeof page.pageNumber === "number" ? page.pageNumber : index + 1,
      width: typeof page.width === "number" ? page.width : undefined,
      height: typeof page.height === "number" ? page.height : undefined,
      unit: typeof page.unit === "string" ? page.unit : undefined,
      lines: linesRaw.map((lineRaw) => {
        const line = (lineRaw ?? {}) as Record<string, unknown>;
        return {
          content: typeof line.content === "string" ? line.content : "",
          polygon: parsePolygon(line.polygon),
        };
      }),
    };
  });

  const tablesRaw = Array.isArray(result.tables) ? result.tables : [];
  const tables: AzureLayoutTable[] = tablesRaw.map((tableRaw) => {
    const table = (tableRaw ?? {}) as Record<string, unknown>;
    const cellsRaw = Array.isArray(table.cells) ? table.cells : [];
    return {
      rowCount: typeof table.rowCount === "number" ? table.rowCount : 0,
      columnCount: typeof table.columnCount === "number" ? table.columnCount : 0,
      boundingRegions: parseBoundingRegions(table.boundingRegions),
      cells: cellsRaw.map((cellRaw) => {
        const cell = (cellRaw ?? {}) as Record<string, unknown>;
        return {
          kind: typeof cell.kind === "string" ? cell.kind : undefined,
          rowIndex: typeof cell.rowIndex === "number" ? cell.rowIndex : 0,
          columnIndex:
            typeof cell.columnIndex === "number" ? cell.columnIndex : 0,
          rowSpan: typeof cell.rowSpan === "number" ? cell.rowSpan : undefined,
          columnSpan:
            typeof cell.columnSpan === "number" ? cell.columnSpan : undefined,
          content: typeof cell.content === "string" ? cell.content : "",
          boundingRegions: parseBoundingRegions(cell.boundingRegions),
        };
      }),
    };
  });

  return {
    content: typeof result.content === "string" ? result.content.trim() : "",
    pages,
    tables,
  };
}

export type AzurePolygon = number[];

export type AzureLayoutBoundingRegion = {
  pageNumber: number;
  polygon: AzurePolygon;
};

export type AzureLayoutTableCell = {
  kind?: string;
  rowIndex: number;
  columnIndex: number;
  rowSpan?: number;
  columnSpan?: number;
  content: string;
  boundingRegions?: AzureLayoutBoundingRegion[];
};

export type AzureLayoutTable = {
  rowCount: number;
  columnCount: number;
  cells: AzureLayoutTableCell[];
  boundingRegions?: AzureLayoutBoundingRegion[];
};

export type AzureLayoutPageLine = {
  content: string;
  polygon?: AzurePolygon;
};

export type AzureLayoutPage = {
  pageNumber: number;
  width?: number;
  height?: number;
  unit?: string;
  lines?: AzureLayoutPageLine[];
};

export type AzureLayoutAnalyzeResult = {
  content: string;
  pages: AzureLayoutPage[];
  tables: AzureLayoutTable[];
};

const ANALYZE_API_VERSION = "2024-11-30";
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 55_000;

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

      return parseAnalyzeResult(body.analyzeResult);
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
