/**
 * Browser helper: send original PDF/image bytes to Document Intelligence.
 */

import type { DocumentParseKind } from "./ocr-types";
import type {
  InvoiceTextParseCategory,
  InvoiceTextParseResult,
} from "./text-parse-schema";
import { normalizeTextParseResult } from "./text-parse-schema";

export type AnalyzeDocumentResult = {
  kind: "invoice" | "abe";
  fields: InvoiceTextParseResult;
  rawText: string;
  modelId: string;
};

export type AnalyzeDocumentOptions = {
  /** Force invoice or ABE parse service; default auto-detect after OCR. */
  kind?: DocumentParseKind;
};

export class AnalyzeDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzeDocumentError";
  }
}

async function analyzeOneFile(
  file: File,
  kind: DocumentParseKind = "auto",
): Promise<AnalyzeDocumentResult> {
  const formData = new FormData();
  formData.set("file", file);
  if (kind !== "auto") {
    formData.set("kind", kind);
  }

  const response = await fetch("/api/documents/analyze", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        ok: true;
        kind?: "invoice" | "abe";
        fields: InvoiceTextParseResult;
        rawText: string;
        modelId: string;
      }
    | { ok: false; error?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new AnalyzeDocumentError(
      payload && "error" in payload && payload.error
        ? payload.error
        : `Analyse fehlgeschlagen (${response.status}).`,
    );
  }

  return {
    kind:
      payload.kind ??
      (payload.fields.category === "abe" ? "abe" : "invoice"),
    fields: payload.fields,
    rawText: payload.rawText,
    modelId: payload.modelId,
  };
}

function mergeFields(
  results: AnalyzeDocumentResult[],
): InvoiceTextParseResult {
  const categories = results.map((result) => result.fields.category);
  const categoryVotes = new Map<InvoiceTextParseCategory, number>();
  for (const category of categories) {
    categoryVotes.set(category, (categoryVotes.get(category) ?? 0) + 1);
  }

  let category: InvoiceTextParseCategory = "other";
  let bestVotes = -1;
  for (const [value, votes] of categoryVotes) {
    if (votes > bestVotes) {
      category = value;
      bestVotes = votes;
    }
  }

  const amounts = results
    .map((result) => result.fields.amount)
    .filter((value): value is number => typeof value === "number");

  const lineItems = results.flatMap(
    (result) => result.fields.lineItems ?? [],
  );
  const vehicleApprovals = results.flatMap(
    (result) => result.fields.vehicleApprovals ?? [],
  );
  const conditions = results.flatMap(
    (result) => result.fields.conditions ?? [],
  );

  return normalizeTextParseResult({
    vendor: results.find((result) => result.fields.vendor)?.fields.vendor ?? null,
    date: results.find((result) => result.fields.date)?.fields.date ?? null,
    amount: amounts.length > 0 ? Math.max(...amounts) : null,
    category,
    summary:
      results.find((result) => result.fields.summary)?.fields.summary ?? null,
    lineItems: lineItems.length > 0 ? lineItems : null,
    kbaNumber:
      results.find((result) => result.fields.kbaNumber)?.fields.kbaNumber ??
      null,
    vehicleApprovals:
      vehicleApprovals.length > 0 ? vehicleApprovals : null,
    authority:
      results.find((result) => result.fields.authority)?.fields.authority ??
      null,
    conditions: conditions.length > 0 ? conditions : null,
    partCategory:
      results.find((result) => result.fields.partCategory)?.fields
        .partCategory ?? null,
    notes: results.find((result) => result.fields.notes)?.fields.notes ?? null,
    manufacturer:
      results.find((result) => result.fields.manufacturer)?.fields
        .manufacturer ?? null,
    invoiceNumber:
      results.find((result) => result.fields.invoiceNumber)?.fields
        .invoiceNumber ?? null,
    mileageKm:
      results.find((result) => typeof result.fields.mileageKm === "number")
        ?.fields.mileageKm ?? null,
  });
}

/**
 * Analyze one or more prepared files. Multi-page images are analyzed
 * page-by-page (each already A4-cropped + compressed at ingest).
 * Pass `kind: "abe"` to force the ABE parse service (prefer a single combined PDF).
 */
export async function analyzeDocumentFiles(
  files: File[],
  onPageProgress?: (page: number, totalPages: number) => void,
  options: AnalyzeDocumentOptions = {},
): Promise<AnalyzeDocumentResult> {
  if (files.length === 0) {
    throw new AnalyzeDocumentError("Keine Datei für die Analyse vorhanden.");
  }

  const kind = options.kind ?? "auto";

  if (files.length === 1) {
    onPageProgress?.(1, 1);
    return analyzeOneFile(files[0], kind);
  }

  const results: AnalyzeDocumentResult[] = [];
  for (let index = 0; index < files.length; index += 1) {
    onPageProgress?.(index + 1, files.length);
    results.push(await analyzeOneFile(files[index], kind));
  }

  const rawText = results
    .map((result, index) => `--- Seite ${index + 1} ---\n${result.rawText}`)
    .join("\n\n")
    .trim();

  const mergedKind = results.some((result) => result.kind === "abe")
    ? "abe"
    : "invoice";

  return {
    kind: mergedKind,
    fields: mergeFields(results),
    rawText,
    modelId: results[0]?.modelId ?? "prebuilt-read",
  };
}

/** @deprecated Prefer analyzeDocumentFiles — kept for single-file call sites. */
export async function analyzeDocumentFile(
  file: File,
  options?: AnalyzeDocumentOptions,
): Promise<AnalyzeDocumentResult> {
  return analyzeDocumentFiles([file], undefined, options);
}
