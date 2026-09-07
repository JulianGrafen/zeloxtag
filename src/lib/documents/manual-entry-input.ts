import { z } from "zod";

import { parseLineItems, sumLineItems } from "@/lib/documents/line-items";
import { MANUAL_ENTRY_CATEGORIES } from "@/lib/documents/manual-entries";
import { parseManualEntryCategory } from "@/lib/documents/manual-entries";

export function parseManualEntryAmount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  if (/%/.test(raw)) return null;
  let normalized = raw.replace(/\s/g, "").replace(/€|eur/gi, "");
  if (/\d,\d{1,2}$/.test(normalized) && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/\d,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  }
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export function parseManualEntryMileageKm(
  raw: string | undefined,
): number | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0 || value > 9_999_999) return null;
  return value;
}

export function parseManualEntryDate(raw: string | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export const manualEntryWriteFieldsSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().min(1).max(128),
  category: z.enum(MANUAL_ENTRY_CATEGORIES),
  title: z.string().trim().min(2).max(160),
  date: z.string().trim().max(32).optional().default(""),
  amount: z.string().trim().max(32).optional().default(""),
  vendor: z.string().trim().max(160).optional().default(""),
  mileageKm: z.string().trim().max(16).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});

export const manualEntryUpdateFieldsSchema = manualEntryWriteFieldsSchema.extend({
  documentId: z.string().uuid(),
});

export function manualEntryFieldsFromFormData(formData: FormData) {
  const categoryRaw = String(formData.get("category") ?? "");
  return {
    documentId: String(formData.get("documentId") ?? ""),
    vehicleId: String(formData.get("vehicleId") ?? ""),
    tagUuid: String(formData.get("tagUuid") ?? ""),
    category: parseManualEntryCategory(categoryRaw) ?? "service",
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    vendor: String(formData.get("vendor") ?? ""),
    mileageKm: String(formData.get("mileageKm") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export function resolveManualEntryAmount(
  formData: FormData,
  amountRaw: string,
): number | null {
  const lineItems = parseLineItems(formData.get("lineItems"));
  const amountFromLines = sumLineItems(lineItems);
  return amountFromLines ?? parseManualEntryAmount(amountRaw);
}
