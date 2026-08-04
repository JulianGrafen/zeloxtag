import { z } from "zod";

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
    kbaNumber: z.string().trim().max(80).optional().default(""),
    vehicleApprovals: z.string().max(20_000).optional().default(""),
    authority: z.string().trim().max(120).optional().default(""),
    conditions: z.string().max(80_000).optional().default(""),
    technicalSpecs: z.string().max(40_000).optional().default(""),
    partCategory: z.string().trim().max(60).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
    manufacturer: z.string().trim().max(120).optional().default(""),
    invoiceNumber: z.string().trim().max(80).optional().default(""),
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
  };
}
