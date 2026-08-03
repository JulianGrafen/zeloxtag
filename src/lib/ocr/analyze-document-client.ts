/**
 * Browser helper: send original PDF/image bytes to Document Intelligence.
 */

import type {
  InvoiceTextParseCategory,
  InvoiceTextParseResult,
} from "./text-parse-schema";
import { normalizeVehicleApprovals } from "./abe-from-text";
import { enrichAbeFieldsFromText } from "./enrich-abe-fields";
import { normalizeTextParseResult } from "./text-parse-schema";

export type AnalyzeDocumentResult = {
  fields: InvoiceTextParseResult;
  rawText: string;
  modelId: string;
};

export class AnalyzeDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzeDocumentError";
  }
}

async function analyzeOneFile(file: File): Promise<AnalyzeDocumentResult> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/documents/analyze", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        ok: true;
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
      vehicleApprovals.length > 0
        ? normalizeVehicleApprovals(vehicleApprovals)
        : null,
    authority:
      results.find((result) => result.fields.authority)?.fields.authority ??
      null,
    conditions: conditions.length > 0 ? conditions.slice(0, 40) : null,
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
 */
export async function analyzeDocumentFiles(
  files: File[],
  onPageProgress?: (page: number, totalPages: number) => void,
): Promise<AnalyzeDocumentResult> {
  if (files.length === 0) {
    throw new AnalyzeDocumentError("Keine Datei für die Analyse vorhanden.");
  }

  if (files.length === 1) {
    onPageProgress?.(1, 1);
    const single = await analyzeOneFile(files[0]);
    return {
      ...single,
      fields: enrichAbeFieldsFromText(single.fields, single.rawText),
    };
  }

  const results: AnalyzeDocumentResult[] = [];
  for (let index = 0; index < files.length; index += 1) {
    onPageProgress?.(index + 1, files.length);
    results.push(await analyzeOneFile(files[index]));
  }

  const rawText = results
    .map((result, index) => `--- Seite ${index + 1} ---\n${result.rawText}`)
    .join("\n\n")
    .trim();

  return {
    fields: enrichAbeFieldsFromText(mergeFields(results), rawText),
    rawText,
    modelId: results[0]?.modelId ?? "prebuilt-read",
  };
}

/** @deprecated Prefer analyzeDocumentFiles — kept for single-file call sites. */
export async function analyzeDocumentFile(
  file: File,
): Promise<AnalyzeDocumentResult> {
  return analyzeDocumentFiles([file]);
}
