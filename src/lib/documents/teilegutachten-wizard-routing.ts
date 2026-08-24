import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import type { TeilegutachtenExtraction } from "@/lib/validations/teilegutachtenSchema";
import {
  teilegutachtenToApprovalFields,
  teilegutachtenVehicleApprovals,
} from "@/lib/validations/teilegutachtenSchema";
import {
  mergeTeilegutachtenCompatibilityTables,
} from "@/lib/validations/teilegutachten-compatibility-table";

export type TeilegutachtenWizardCapturePhase =
  | "capture-verwendungsbereich"
  | "capture-auflagen"
  | "capture-technical-prompt";

function teilegutachtenApproval(
  approvalFields: ApprovalFields | null,
): Extract<ApprovalFields, { kind: "teilegutachten" }> | null {
  if (approvalFields?.kind !== "teilegutachten") return null;
  return approvalFields;
}

export function coverHasVehicleScope(
  fields: InvoiceTextParseResult,
  approvalFields: ApprovalFields | null,
): boolean {
  const approval = teilegutachtenApproval(approvalFields);
  if (approval?.data.compatibilityTable?.rows?.length) return true;
  if ((fields.vehicleApprovals?.length ?? 0) > 0) return true;

  const validity = approval?.data.validityArea?.trim() ?? "";
  if (
    validity.length > 12 &&
    !/siehe original/i.test(validity) &&
    !/^fahrzeugfreigaben siehe tabelle\.?$/i.test(validity)
  ) {
    return true;
  }

  const notes = fields.notes ?? "";
  if (/Verwendungsbereich:\s*\n[^\n]+/i.test(notes)) return true;

  return false;
}

export function coverHasAuflagen(
  fields: InvoiceTextParseResult,
  approvalFields: ApprovalFields | null,
): boolean {
  if ((fields.conditions?.length ?? 0) > 0) return true;
  void approvalFields;
  return false;
}

export function coverHasTechnicalData(
  approvalFields: ApprovalFields | null,
): boolean {
  const approval = teilegutachtenApproval(approvalFields);
  return Boolean(approval?.data.technicalDataTable?.rows?.length);
}

/** After Kennzeichnung scan — Section IV (Auflagen und Hinweise) is always next. */
export function nextTeilegutachtenWizardPhaseAfterMarking(): "capture-auflagen" {
  return "capture-auflagen";
}

/** After Auflagen scan — optional Technische Daten, then Verwendungsbereich table last. */
export function nextTeilegutachtenWizardPhaseAfterAuflagen(): "capture-technical-prompt" {
  return "capture-technical-prompt";
}

/** After optional Technische Daten — Verwendungsbereich table is always last. */
export function nextTeilegutachtenWizardPhaseAfterTechnical(): "capture-verwendungsbereich" {
  return "capture-verwendungsbereich";
}

/** @deprecated Prefer afterMarking / afterAuflagen routing in the wizard. */
export function nextTeilegutachtenWizardPhaseAfterCover(input: {
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
}): TeilegutachtenWizardCapturePhase {
  const hasVehicleScope = coverHasVehicleScope(
    input.fields,
    input.approvalFields,
  );
  const hasAuflagen = coverHasAuflagen(input.fields, input.approvalFields);

  if (!hasVehicleScope) return "capture-verwendungsbereich";
  if (!hasAuflagen) return "capture-auflagen";
  return "capture-technical-prompt";
}

/** Prefer richer values when merging cover draft with full-document OCR. */
export function mergeTeilegutachtenExtractions(
  cover: TeilegutachtenExtraction,
  full: TeilegutachtenExtraction,
): TeilegutachtenExtraction {
  const pickLonger = (a: string | null, b: string | null) => {
    const left = a?.trim() ?? "";
    const right = b?.trim() ?? "";
    if (!left) return right || null;
    if (!right) return left;
    return right.length > left.length ? right : left;
  };

  return {
    ...full,
    certificateNumber: full.certificateNumber ?? cover.certificateNumber,
    issueDate: full.issueDate ?? cover.issueDate,
    manufacturer: pickLonger(cover.manufacturer, full.manufacturer),
    partCategory: pickLonger(cover.partCategory, full.partCategory),
    modificationType: pickLonger(cover.modificationType, full.modificationType),
    partType: pickLonger(cover.partType, full.partType),
    markingType: full.markingType ?? cover.markingType,
    markingNumber: full.markingNumber ?? cover.markingNumber,
    physicalMarking: full.physicalMarking ?? cover.physicalMarking,
    testingOrganization:
      full.testingOrganization ?? cover.testingOrganization,
    userVehicleMatchStatus:
      full.userVehicleMatchStatus ?? cover.userVehicleMatchStatus,
    matchedVehicleRow: full.matchedVehicleRow ?? cover.matchedVehicleRow,
    compatibilityTable: mergeTeilegutachtenCompatibilityTables(
      full.compatibilityTable,
      cover.compatibilityTable,
    ),
    verwendungsbereich: pickLonger(
      cover.verwendungsbereich,
      full.verwendungsbereich,
    ),
    auflagen:
      (full.auflagen?.length ?? 0) >= (cover.auflagen?.length ?? 0)
        ? full.auflagen
        : cover.auflagen,
    technicalDataTable:
      full.technicalDataTable?.rows?.length
        ? full.technicalDataTable
        : cover.technicalDataTable,
    ownerNotes: pickLonger(cover.ownerNotes, full.ownerNotes),
    requiresPhysicalInspection: true,
    documentType: "Teilegutachten",
  };
}

export function coverExtractionSummary(extracted: TeilegutachtenExtraction): {
  hasPartDescription: boolean;
  hasPartType: boolean;
  hasManufacturer: boolean;
  hasVehicleScope: boolean;
  vehicleApprovals: string[] | null;
} {
  const vehicleApprovals = teilegutachtenVehicleApprovals(extracted);
  const fields = teilegutachtenToApprovalFields(extracted);

  return {
    hasPartDescription: Boolean(
      extracted.modificationType?.trim() || extracted.partCategory?.trim(),
    ),
    hasPartType: Boolean(extracted.partType?.trim()),
    hasManufacturer: Boolean(extracted.manufacturer?.trim()),
    hasVehicleScope: coverHasVehicleScope(
      {
        vendor: extracted.partType,
        date: extracted.issueDate,
        amount: null,
        category: "abe",
        summary: null,
        lineItems: null,
        kbaNumber: extracted.certificateNumber,
        vehicleApprovals,
        authority: extracted.testingOrganization,
        conditions: extracted.auflagen,
        partCategory: extracted.modificationType ?? extracted.partCategory,
        notes: extracted.verwendungsbereich
          ? `Verwendungsbereich:\n${extracted.verwendungsbereich}`
          : null,
        manufacturer: extracted.manufacturer,
        invoiceNumber: extracted.certificateNumber,
        mileageKm: null,
      },
      fields,
    ),
    vehicleApprovals,
  };
}
