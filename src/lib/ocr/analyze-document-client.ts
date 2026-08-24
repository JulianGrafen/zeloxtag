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

  const approvalKind = options.approvalKind ?? null;
  const vehicleContext = options.vehicleContext ?? null;
  const garageVin = options.garageVin ?? null;
  const invoiceCategory = options.invoiceCategory ?? null;
  const teilegutachtenScope = options.teilegutachtenScope;
  const pruefung192Scope = options.pruefung192Scope;

  if (files.length === 1) {
    onPageProgress?.(1, 1);
    return analyzeOneFile(
      files[0],
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

  const results: AnalyzeDocumentResult[] = [];
  for (let index = 0; index < files.length; index += 1) {
    onPageProgress?.(index + 1, files.length);
    results.push(
      await analyzeOneFile(
        files[index],
        vehicleId,
        documentType,
        approvalKind,
        vehicleContext,
        garageVin,
        invoiceCategory,
        index === 0 ? teilegutachtenScope : undefined,
        index === 0 ? pruefung192Scope : undefined,
      ),
    );
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
