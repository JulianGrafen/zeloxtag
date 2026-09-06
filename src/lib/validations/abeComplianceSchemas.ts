import { z } from "zod";

/** Max PDF pages accepted for ABE smart upload / extraction. */
export const ABE_UPLOAD_MAX_PAGES = 20;

/** Max vision-billed PDF pages after KBA page localization. */
export const ABE_VISION_MAX_BILLED_PAGES = 3;

export const abeUploadSchema = z
  .object({
    pageCount: z
      .number()
      .int()
      .min(1)
      .max(ABE_UPLOAD_MAX_PAGES),
  })
  .strict();

export type AbeUploadInput = z.infer<typeof abeUploadSchema>;

export function validateAbeUploadPageCount(pageCount: number): string | null {
  const parsed = abeUploadSchema.safeParse({ pageCount });
  if (parsed.success) return null;
  return `PDF hat zu viele Seiten (max. ${ABE_UPLOAD_MAX_PAGES}).`;
}

export function mayRenderAbeValidBadge(input: {
  kbaNumber?: string | null;
  abeNr?: string | null;
  userConfirmed?: boolean;
}): boolean {
  if (input.userConfirmed) return true;

  const kbaDigits = (input.kbaNumber ?? "").replace(/\D/g, "");
  if (kbaDigits.length >= 4) return true;

  const abeDigits = (input.abeNr ?? "").replace(/\D/g, "");
  if (abeDigits.length >= 4) return true;

  return false;
}
