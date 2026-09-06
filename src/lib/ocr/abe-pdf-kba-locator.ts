import "server-only";

import { normalizeAbeKbaDigits } from "@/lib/validations/abeSchema";
import {
  ABE_UPLOAD_MAX_PAGES,
  ABE_VISION_MAX_BILLED_PAGES,
} from "@/lib/validations/abeComplianceSchemas";

/** Matches embedded PDF text layers, e.g. "KBA 48571" or "KBA48571". */
export const KBA_PDF_TEXT_PATTERN = /KBA\s*(\d{4,6})/gi;

export type KbaTextScanResult = {
  kbaPageIndices: number[];
  kbaDigits: string | null;
};

export function findKbaMatchesInPageTexts(pageTexts: readonly string[]): KbaTextScanResult {
  const kbaPageIndices: number[] = [];
  let kbaDigits: string | null = null;

  for (let pageIndex = 0; pageIndex < pageTexts.length; pageIndex += 1) {
    const text = pageTexts[pageIndex] ?? "";
    KBA_PDF_TEXT_PATTERN.lastIndex = 0;
    const match = KBA_PDF_TEXT_PATTERN.exec(text);
    if (!match) continue;

    kbaPageIndices.push(pageIndex);
    if (!kbaDigits) {
      const normalized = normalizeAbeKbaDigits(match[1] ?? "");
      if (normalized) kbaDigits = normalized;
    }
  }

  return { kbaPageIndices, kbaDigits };
}

/**
 * Vision runs on KBA hit pages ±1 neighbor, capped at three billed pages.
 * When no KBA text is found, only page 0 is sent to vision (cost guard).
 */
export function selectVisionPagesForKbaHits(
  kbaPageIndices: readonly number[],
  totalPages: number,
): number[] {
  if (totalPages <= 0) return [];

  if (kbaPageIndices.length === 0) {
    return [0];
  }

  const selected = new Set<number>();
  for (const hit of kbaPageIndices) {
    for (const delta of [-1, 0, 1]) {
      const pageIndex = hit + delta;
      if (pageIndex >= 0 && pageIndex < totalPages) {
        selected.add(pageIndex);
      }
    }
  }

  return Array.from(selected)
    .sort((left, right) => left - right)
    .slice(0, ABE_VISION_MAX_BILLED_PAGES);
}

let pdfJsModulePromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null =
  null;

async function loadPdfJs() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfJsModulePromise;
}

async function destroyPdfDocument(doc: unknown): Promise<void> {
  const candidate = doc as { destroy?: () => Promise<void> | void };
  if (typeof candidate.destroy === "function") {
    await candidate.destroy();
  }
}

export type PdfPageTextScan = {
  pageTexts: string[];
  totalPages: number;
};

/**
 * Extract embedded text from every PDF page (cheap) before any vision billing.
 * Scans at most {@link ABE_UPLOAD_MAX_PAGES} pages for text extraction.
 */
export async function extractPdfPageTextsServer(
  bytes: Buffer,
): Promise<PdfPageTextScan> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0,
  });
  const doc = await loadingTask.promise;
  const totalPages = Math.max(1, doc.numPages);
  const scanLimit = Math.min(totalPages, ABE_UPLOAD_MAX_PAGES);
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= scanLimit; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pageTexts.push(pageText);
    if (typeof page.cleanup === "function") {
      page.cleanup();
    }
  }

  await destroyPdfDocument(doc);
  return { pageTexts, totalPages };
}

export class AbePdfPageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbePdfPageLimitError";
  }
}
