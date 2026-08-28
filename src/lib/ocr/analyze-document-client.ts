/**
 * Browser helper: vision LLM document parse via `/api/ocr/parse`.
 */

import type {
  ApprovalFieldKind,
  ApprovalFields,
} from "@/lib/documents/approval-fields";
import { parseApprovalFields } from "@/lib/documents/approval-fields";

import type { AbeVehicleContext } from "@/lib/validations/abeSchema";

import type { DocumentParseKind, OcrDocumentType } from "./ocr-types";
import {
  isPdfUploadFile,
  prepareClientOcrFiles,
  resolveClientOcrMaxPages,
} from "./prepare-client-ocr-file";
import type {
  InvoiceTextParseCategory,
  InvoiceTextParseResult,
} from "./text-parse-schema";
import { normalizeTextParseResult } from "./text-parse-schema";

export type AnalyzeDocumentResult = {
  kind: "invoice" | "abe";
  documentType: OcrDocumentType;
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  rawText: string;
  modelId: string;
  parseModel?: string;
};

export type AnalyzeDocumentOptions = {
  /** Garage twin — required for server-side OCR access checks. */
  vehicleId: string;
  /** Explicit document type for model routing (preferred). */
  documentType?: OcrDocumentType;
  /** Explicit Gutachten / TÜV subtype from scan picker. */
  approvalKind?: ApprovalFieldKind | null;
  /** Garage vehicle for ABE Verwendungsbereich match. */
  vehicleContext?: AbeVehicleContext | null;
  /** Garage twin VIN for §21 Einzelabnahme Field E verification. */
  garageVin?: string | null;
  /** Locked invoice category from scan picker (repair/service/tuning). */
  invoiceCategory?: InvoiceTextParseCategory | null;
  /** Teilegutachten wizard — cover page OCR to skip redundant scans. */
  teilegutachtenScope?: "cover" | "marking" | "verwendungsbereich" | "full";
  /** §19(2) Prüfung wizard — scoped page extraction. */
  pruefung192Scope?: "bericht" | "gutachten" | "vorschriften" | "full";
  /** @deprecated Prefer `documentType`. Mapped to documentType when unset. */
  kind?: DocumentParseKind;
};

export class AnalyzeDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzeDocumentError";
  }
}

function resolveDocumentType(
  options: AnalyzeDocumentOptions,
): OcrDocumentType {
  if (options.documentType) return options.documentType;
  if (options.kind === "abe") return "abe";
  if (options.kind === "invoice") return "invoice";
  // auto / unset → invoice routing (mid-tier); server may still classify fields.
  return "invoice";
}

async function analyzeOneFile(
  file: File,
  vehicleId: string,
  documentType: OcrDocumentType,
  approvalKind?: ApprovalFieldKind | null,
  vehicleContext?: AbeVehicleContext | null,
  garageVin?: string | null,
  invoiceCategory?: InvoiceTextParseCategory | null,
  teilegutachtenScope?: "cover" | "marking" | "verwendungsbereich" | "full",
  pruefung192Scope?: "bericht" | "gutachten" | "vorschriften" | "full",
): Promise<AnalyzeDocumentResult> {
  const formData = new FormData();
  formData.set("vehicleId", vehicleId);
  formData.set("file", file);
  formData.set("documentType", documentType);
  if (approvalKind) {
    formData.set("approvalKind", approvalKind);
  }
  if (vehicleContext) {
    formData.set("vehicleContext", JSON.stringify(vehicleContext));
  }
  if (garageVin) {
    formData.set("garageVin", garageVin);
  }
  if (invoiceCategory) {
    formData.set("invoiceCategory", invoiceCategory);
  }
  if (teilegutachtenScope) {
    formData.set("teilegutachtenScope", teilegutachtenScope);
  }
  if (pruefung192Scope) {
    formData.set("pruefung192Scope", pruefung192Scope);
  }

  const response = await fetch("/api/ocr/parse", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        ok: true;
        documentType: OcrDocumentType;
        parseModel?: string;
        fields: InvoiceTextParseResult;
        approvalFields?: ApprovalFields | null;
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
    kind: payload.documentType === "abe" ? "abe" : "invoice",
    documentType: payload.documentType,
    fields: payload.fields,
    approvalFields: parseApprovalFields(payload.approvalFields ?? null),
    rawText: payload.rawText,
    modelId: payload.modelId,
    parseModel: payload.parseModel,
  };
}

const DEFAULT_OCR_MAX_PARALLEL_PAGES = 2;

/** Bounded concurrency for multi-page OCR (client-side). */
export function resolveOcrMaxParallelPages(): number {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_OCR_MAX_PARALLEL_PAGES
      : undefined;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 4) {
      return parsed;
    }
  }
  return DEFAULT_OCR_MAX_PARALLEL_PAGES;
}

/**
 * Run async tasks with a concurrency cap; results preserve input order.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  onItemComplete?: (completedCount: number, total: number) => void,
): Promise<R[]> {
  if (items.length === 0) return [];

  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let completedCount = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      results[index] = await fn(items[index], index);
      completedCount += 1;
      onItemComplete?.(completedCount, items.length);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
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

/** Merge per-page OCR fields into one review payload (page order preserved). */
export function mergeAnalyzeDocumentFields(
  results: AnalyzeDocumentResult[],
): InvoiceTextParseResult {
  return mergeFields(results);
}

/**
 * Analyze one or more prepared files via vision LLM parse.
 */
export async function analyzeDocumentFiles(
  files: File[],
  onPageProgress: ((page: number, totalPages: number) => void) | undefined,
  options: AnalyzeDocumentOptions,
): Promise<AnalyzeDocumentResult> {
  if (files.length === 0) {
    throw new AnalyzeDocumentError("Keine Datei für die Analyse vorhanden.");
  }

  if (!options.vehicleId?.trim()) {
    throw new AnalyzeDocumentError("vehicleId fehlt für die Dokumentanalyse.");
  }

  const documentType = resolveDocumentType(options);
  const vehicleId = options.vehicleId.trim();

  const maxPages = resolveClientOcrMaxPages({
    documentType,
    approvalKind: options.approvalKind ?? null,
  });
  const expandedFiles: File[] = [];
  for (const file of files) {
    if (isPdfUploadFile(file)) {
      expandedFiles.push(
        ...(await prepareClientOcrFiles(file, { maxPages })),
      );
    } else {
      expandedFiles.push(file);
    }
  }

  const approvalKind = options.approvalKind ?? null;
  const vehicleContext = options.vehicleContext ?? null;
  const garageVin = options.garageVin ?? null;
  const invoiceCategory = options.invoiceCategory ?? null;
  const teilegutachtenScope = options.teilegutachtenScope;
  const pruefung192Scope = options.pruefung192Scope;

  if (expandedFiles.length === 1) {
    onPageProgress?.(1, 1);
    return analyzeOneFile(
      expandedFiles[0],
      vehicleId,
      documentType,
      approvalKind,
      vehicleContext,
      garageVin,
      invoiceCategory,
      teilegutachtenScope,
      pruefung192Scope,
    );
  }

  const results = await mapWithConcurrency(
    expandedFiles,
    resolveOcrMaxParallelPages(),
    (file, index) =>
      analyzeOneFile(
        file,
        vehicleId,
        documentType,
        approvalKind,
        vehicleContext,
        garageVin,
        invoiceCategory,
        index === 0 ? teilegutachtenScope : undefined,
        index === 0 ? pruefung192Scope : undefined,
      ),
    (completed, total) => onPageProgress?.(completed, total),
  );

  const rawText = results
    .map((result, index) => `--- Seite ${index + 1} ---\n${result.rawText}`)
    .join("\n\n")
    .trim();

  const mergedKind = results.some((result) => result.kind === "abe")
    ? "abe"
    : "invoice";

  return {
    kind: mergedKind,
    documentType,
    fields: mergeFields(results),
    approvalFields:
      results.find((result) => result.approvalFields)?.approvalFields ?? null,
    rawText,
    modelId: results[0]?.modelId ?? "prebuilt-layout",
    parseModel: results[0]?.parseModel,
  };
}

/** @deprecated Prefer analyzeDocumentFiles. */
export async function analyzeDocumentFile(
  file: File,
  options: AnalyzeDocumentOptions,
): Promise<AnalyzeDocumentResult> {
  return analyzeDocumentFiles([file], undefined, options);
}
