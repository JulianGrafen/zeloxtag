import type { ApprovalFields } from "@/lib/documents/approval-fields";
import {
  analyzeDocumentFiles,
  type AnalyzeDocumentResult,
} from "@/lib/ocr/analyze-document-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import { normalizeDocumentDateIso } from "@/lib/documents/format";
import {
  gutachtenToAnalyzeFields,
  gutachtenToApprovalFields,
  mergeGutachtenExtractionsSafe,
  refineGutachtenExtractionSubtype,
  type GutachtenDocumentSubtype,
  type GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";

export type EnrichedGutachtenAnalysis = {
  result: AnalyzeDocumentResult;
  extraction: GutachtenExtraction;
};

function pickLonger(
  left: string | null | undefined,
  right: string | null | undefined,
): string | null {
  const a = left?.trim() ?? "";
  const b = right?.trim() ?? "";
  if (!a) return b || null;
  if (!b) return a;
  return b.length > a.length ? b : a;
}

function mergeAnalyzeFields(
  base: InvoiceTextParseResult,
  cover: InvoiceTextParseResult,
): InvoiceTextParseResult {
  return {
    ...cover,
    ...base,
    vendor: pickLonger(base.vendor, cover.vendor),
    date: base.date ?? cover.date,
    summary: pickLonger(base.summary, cover.summary),
    kbaNumber: base.kbaNumber ?? cover.kbaNumber,
    manufacturer: pickLonger(base.manufacturer, cover.manufacturer),
    partCategory: pickLonger(base.partCategory, cover.partCategory),
    authority: pickLonger(base.authority, cover.authority),
    notes: pickLonger(base.notes, cover.notes),
    invoiceNumber: base.invoiceNumber ?? cover.invoiceNumber,
    vehicleApprovals:
      (base.vehicleApprovals?.length ?? 0) >=
      (cover.vehicleApprovals?.length ?? 0)
        ? base.vehicleApprovals
        : cover.vehicleApprovals,
    conditions:
      (base.conditions?.length ?? 0) >= (cover.conditions?.length ?? 0)
        ? base.conditions
        : cover.conditions,
    mileageKm: base.mileageKm ?? cover.mileageKm,
  };
}

function normalizePatchIssueDate(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  const normalized = normalizeDocumentDateIso(value.trim());
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return undefined;
  return normalized;
}

function patchFromTeilegutachtenCover(
  base: GutachtenExtraction,
  cover: AnalyzeDocumentResult,
): Partial<GutachtenExtraction> {
  const fields = cover.fields;
  const approval =
    cover.approvalFields?.kind === "teilegutachten"
      ? cover.approvalFields.data
      : null;

  const partName =
    pickLonger(fields.partCategory, fields.summary) ??
    pickLonger(fields.vendor, base.partName) ??
    base.partName;

  return {
    partName: partName ?? base.partName,
    modificationType:
      pickLonger(fields.partCategory, fields.notes) ?? undefined,
    manufacturer: fields.manufacturer?.trim() || undefined,
    certificateNumber:
      fields.kbaNumber?.trim() || fields.invoiceNumber?.trim() || undefined,
    testOrganization:
      fields.authority?.trim() || fields.vendor?.trim() || undefined,
    issueDate: normalizePatchIssueDate(fields.date) || undefined,
    markingType: approval?.markingType?.trim() || undefined,
    markingNumber: approval?.markingNumber?.trim() || undefined,
    ownerNotes: approval?.ownerNotes?.trim() || undefined,
    matchedVehicleRow: fields.vehicleApprovals?.[0]?.trim() || undefined,
    vehicleMatchNotes:
      approval?.validityArea?.trim() ||
      fields.vehicleApprovals?.[0]?.trim() ||
      undefined,
    conditions: fields.conditions?.length ? fields.conditions : undefined,
  };
}

function patchFromEinzelabnahmeCover(
  base: GutachtenExtraction,
  cover: AnalyzeDocumentResult,
): Partial<GutachtenExtraction> {
  const fields = cover.fields;
  const approval =
    cover.approvalFields?.kind === "einzelabnahme"
      ? cover.approvalFields.data
      : null;

  const modelHint = fields.vendor?.trim();
  const field22 =
    approval?.field22Text?.trim() ||
    fields.notes?.trim() ||
    undefined;

  return {
    partName:
      field22?.split("\n")[0]?.trim().slice(0, 240) ||
      modelHint ||
      base.partName,
    modificationType: field22,
    modificationsField22: field22,
    manufacturer: fields.manufacturer?.trim() || undefined,
    certificateNumber:
      fields.kbaNumber?.trim() || fields.invoiceNumber?.trim() || undefined,
    testOrganization: fields.authority?.trim() || undefined,
    issueDate: normalizePatchIssueDate(fields.date) || undefined,
    vin: fields.notes?.includes("VIN")
      ? fields.notes.match(/\b[A-HJ-NPR-Z0-9]{11,17}\b/i)?.[0]
      : undefined,
    vehicleMatchNotes: modelHint || undefined,
  };
}

function patchFromPruefung192Cover(
  base: GutachtenExtraction,
  cover: AnalyzeDocumentResult,
): Partial<GutachtenExtraction> {
  const fields = cover.fields;
  const approval =
    cover.approvalFields?.kind === "pruefung192"
      ? cover.approvalFields.data
      : null;

  const assessed =
    approval?.assessedModifications?.trim() ||
    fields.partCategory?.trim() ||
    fields.summary?.trim();

  const field22 = approval?.field22Text?.trim() || fields.notes?.trim();

  return {
    partName: assessed || base.partName,
    modificationType: assessed || undefined,
    modificationsField22: field22 || undefined,
    manufacturer: fields.manufacturer?.trim() || undefined,
    certificateNumber:
      fields.kbaNumber?.trim() || fields.invoiceNumber?.trim() || undefined,
    testOrganization: fields.authority?.trim() || undefined,
    issueDate: normalizePatchIssueDate(fields.date) || undefined,
    vehicleMatchNotes: fields.vehicleApprovals?.[0]?.trim() || undefined,
  };
}

async function analyzeSubtypeCover(
  file: File,
  vehicleId: string,
  subtype: GutachtenDocumentSubtype,
  vehicleContext?: AbeVehicleContext | null,
): Promise<AnalyzeDocumentResult | null> {
  try {
    switch (subtype) {
      case "TEILEGUTACHTEN":
        return analyzeDocumentFiles([file], undefined, {
          vehicleId,
          documentType: "abe",
          approvalKind: "teilegutachten",
          teilegutachtenScope: "cover",
          vehicleContext: vehicleContext ?? null,
        });
      case "EINZELABNAHME":
        return analyzeDocumentFiles([file], undefined, {
          vehicleId,
          documentType: "abe",
          approvalKind: "einzelabnahme",
        });
      case "ANBAUBESTAETIGUNG":
        return analyzeDocumentFiles([file], undefined, {
          vehicleId,
          documentType: "abe",
          approvalKind: "pruefung192",
          pruefung192Scope: "bericht",
        });
      default:
        return null;
    }
  } catch (error) {
    console.warn("[gutachten-cover-enrichment] cover OCR failed", {
      subtype,
      error,
    });
    return null;
  }
}

function patchForSubtype(
  subtype: GutachtenDocumentSubtype,
  base: GutachtenExtraction,
  cover: AnalyzeDocumentResult,
): Partial<GutachtenExtraction> {
  switch (subtype) {
    case "TEILEGUTACHTEN":
      return patchFromTeilegutachtenCover(base, cover);
    case "EINZELABNAHME":
      return patchFromEinzelabnahmeCover(base, cover);
    case "ANBAUBESTAETIGUNG":
      return patchFromPruefung192Cover(base, cover);
    default:
      return {};
  }
}

/**
 * After unified Gutachten classification, run the legacy cover extractor for
 * the detected subtype and merge rich header fields into the unified model.
 */
export async function enrichGutachtenPrimaryScan(
  file: File,
  vehicleId: string,
  baseResult: AnalyzeDocumentResult,
  baseExtraction: GutachtenExtraction,
  options: {
    vehicleContext?: AbeVehicleContext | null;
  } = {},
): Promise<EnrichedGutachtenAnalysis> {
  try {
    const coverResult = await analyzeSubtypeCover(
      file,
      vehicleId,
      baseExtraction.documentSubtype,
      options.vehicleContext,
    );

    if (!coverResult) {
      return { result: baseResult, extraction: baseExtraction };
    }

    const patch = patchForSubtype(
      baseExtraction.documentSubtype,
      baseExtraction,
      coverResult,
    );
    const extraction = mergeGutachtenExtractionsSafe(baseExtraction, patch);
    const fields = mergeAnalyzeFields(
      gutachtenToAnalyzeFields(extraction),
      coverResult.fields,
    );
    const refinedExtraction = refineGutachtenExtractionSubtype(
      extraction,
      fields,
    );
    const approvalFields: ApprovalFields =
      gutachtenToApprovalFields(refinedExtraction);

    return {
      result: {
        ...baseResult,
        fields,
        approvalFields,
      },
      extraction: refinedExtraction,
    };
  } catch (error) {
    console.warn("[gutachten-cover-enrichment] merge failed", error);
    return { result: baseResult, extraction: baseExtraction };
  }
}
