import { z } from "zod";

/** Persisted caps — keep in sync with {@link uploadDocumentMetaSchema}. */
export const UPLOAD_NOTES_MAX = 4_000;
export const UPLOAD_KBA_NUMBER_MAX = 120;
export const UPLOAD_AUTHORITY_MAX = 200;
export const UPLOAD_PART_CATEGORY_MAX = 2_000;

/**
 * Strict metadata schema for document upload FormData (excluding the file).
 * Unknown keys must never be silently accepted at the action boundary.
 */
export const uploadDocumentMetaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(160),
    type: z.enum(["invoice", "abe", "tuev", "other"]),
    vendor: z.string().trim().max(160).optional().default(""),
    category: z.string().trim().max(40).optional().default(""),
    lineItems: z.string().max(100_000).optional().default(""),
    kbaNumber: z.string().trim().max(UPLOAD_KBA_NUMBER_MAX).optional().default(""),
    vehicleApprovals: z.string().max(20_000).optional().default(""),
    authority: z.string().trim().max(UPLOAD_AUTHORITY_MAX).optional().default(""),
    conditions: z.string().max(80_000).optional().default(""),
    technicalSpecs: z.string().max(40_000).optional().default(""),
    partCategory: z
      .string()
      .trim()
      .max(UPLOAD_PART_CATEGORY_MAX)
      .optional()
      .default(""),
    notes: z.string().trim().max(UPLOAD_NOTES_MAX).optional().default(""),
    manufacturer: z.string().trim().max(120).optional().default(""),
    invoiceNumber: z.string().trim().max(UPLOAD_KBA_NUMBER_MAX).optional().default(""),
    mileageKm: z.string().trim().max(32).optional().default(""),
    pageCount: z.string().trim().max(8).optional().default(""),
    /** JSON string for `documents.approval_fields` (discriminated union). */
    approvalFields: z.string().max(100_000).optional().default(""),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$|^$/)
      .optional()
      .default(""),
    amount: z.string().trim().max(32).optional().default(""),
    /** Set when user confirms “Trotzdem zuordnen” after a vehicle mismatch warning. */
    forceVehicleAssign: z.enum(["", "1"]).optional().default(""),
    /** Set when user confirms “Trotzdem speichern” after a mileage plausibility warning. */
    forceMileageSave: z.enum(["", "1"]).optional().default(""),
  })
  .strict();

export type UploadDocumentMeta = z.infer<typeof uploadDocumentMetaSchema>;

export function metaFromFormData(formData: FormData): unknown {
  return {
    vehicleId: String(formData.get("vehicleId") ?? "").trim(),
    tagUuid: String(formData.get("tagUuid") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "").trim(),
    vendor: String(formData.get("vendor") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    lineItems: String(formData.get("lineItems") ?? ""),
    kbaNumber: String(formData.get("kbaNumber") ?? "").trim(),
    vehicleApprovals: String(formData.get("vehicleApprovals") ?? ""),
    authority: String(formData.get("authority") ?? "").trim(),
    conditions: String(formData.get("conditions") ?? ""),
    technicalSpecs: String(formData.get("technicalSpecs") ?? ""),
    partCategory: String(formData.get("partCategory") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    manufacturer: String(formData.get("manufacturer") ?? "").trim(),
    invoiceNumber: String(formData.get("invoiceNumber") ?? "").trim(),
    mileageKm: String(formData.get("mileageKm") ?? "").trim(),
    pageCount: String(formData.get("pageCount") ?? "").trim(),
    approvalFields: String(formData.get("approvalFields") ?? ""),
    date: String(formData.get("date") ?? "").trim(),
    amount: String(formData.get("amount") ?? "").trim(),
    forceVehicleAssign:
      String(formData.get("forceVehicleAssign") ?? "").trim() === "1"
        ? "1"
        : "",
    forceMileageSave:
      String(formData.get("forceMileageSave") ?? "").trim() === "1"
        ? "1"
        : "",
  };
}
