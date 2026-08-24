import { z } from "zod";

import {
  normalizeAbeKbaDigits,
} from "@/lib/validations/abeSchema";

/**
 * Simplified ABE extraction payload for Smart Review.
 * Full compatibility tables remain in the stored PDF.
 */
export const abeExtractionSchema = z
  .object({
    partName: z.string().trim().min(1).max(240),
    manufacturer: z.string().trim().min(1).max(160).optional(),
    kbaNumber: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .describe("5-digit KBA number, e.g., KBA 48721 or Typzeichen"),
    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    requiresRegistration: z
      .boolean()
      .optional()
      .describe(
        "Whether explicit TÜV registration is required or carrying the ABE suffices",
      ),
  })
  .strict();

export type AbeExtraction = z.infer<typeof abeExtractionSchema>;

const KBA_DIGITS_LEN = 5;

/** Standard KBA / Typzeichen: exactly five digits after normalization. */
export function isValidKbaNumber(value: string): boolean {
  const digits = normalizeAbeKbaDigits(value);
  return digits != null && digits.length === KBA_DIGITS_LEN;
}

export function abeExtractionFromMinimal(
  fields: Partial<{ kbaNumber?: string | null; manufacturer?: string | null; partCategory?: string | null }>,
): AbeExtraction {
  const partName =
    fields.partCategory?.trim() ||
    fields.manufacturer?.trim() ||
    "ABE-Bauteil";

  return abeExtractionSchema.parse({
    partName,
    manufacturer: fields.manufacturer?.trim() || undefined,
    kbaNumber: fields.kbaNumber?.trim() || "",
    issueDate: undefined,
    requiresRegistration: undefined,
  });
}

export function kbaValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "KBA-Nummer fehlt";
  if (!isValidKbaNumber(trimmed)) {
    return "KBA-Nummer: genau 5 Ziffern (z. B. 48721)";
  }
  return null;
}
