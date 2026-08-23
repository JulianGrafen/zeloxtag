import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { Document } from "@/types/database";

function mileageFromApprovalFields(
  approvalFields: ApprovalFields | null | undefined,
): number | null {
  if (approvalFields?.kind !== "tuev") return null;

  const km = approvalFields.data.mileageKm;
  return typeof km === "number" && Number.isFinite(km) && km > 0
    ? Math.round(km)
    : null;
}

/**
 * Authoritative odometer for a stored document.
 * TÜV / §21: `approval_fields` wins over `mileage_km` (Punkt 4 lives in the report payload).
 */
export function resolveDocumentMileageKm(
  document: Pick<Document, "mileage_km" | "approval_fields" | "type" | "category">,
): number | null {
  const fromApproval = mileageFromApprovalFields(document.approval_fields);
  const isTuevDoc =
    document.type === "tuev" ||
    document.category === "tuev" ||
    document.approval_fields?.kind === "tuev";

  if (isTuevDoc && fromApproval !== null) {
    return fromApproval;
  }

  const rowKm = document.mileage_km;
  if (typeof rowKm === "number" && Number.isFinite(rowKm) && rowKm > 0) {
    return Math.round(rowKm);
  }

  return fromApproval;
}

/** Coalesce FormData mileage with structured approval payload on upload. */
export function resolveUploadMileageKm(
  fromForm: number | null,
  approvalFields: ApprovalFields | null,
): number | null {
  if (fromForm !== null) return fromForm;
  return mileageFromApprovalFields(approvalFields);
}

/** Keep `documents.mileage_km` and subtype mileage in sync when persisting. */
export function syncApprovalFieldsMileage(
  approvalFields: ApprovalFields | null,
  mileageKm: number | null,
): ApprovalFields | null {
  if (mileageKm === null || !approvalFields) return approvalFields;

  if (approvalFields.kind === "tuev") {
    if (approvalFields.data.mileageKm === mileageKm) return approvalFields;
    return {
      kind: "tuev",
      data: { ...approvalFields.data, mileageKm },
    };
  }

  return approvalFields;
}
