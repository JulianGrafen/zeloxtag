/**
 * @deprecated Prefer {@link abeExtractionService.extractFromText}.
 */

import { abeExtractionService } from "@/services/ocr/AbeExtractionService";
import type { AbeMinimal } from "@/lib/validations/abeSchema";

/** @deprecated Prefer `abeExtractionService.extractFromText`. */
export async function extractAbeFieldsFromText(
  rawText: string,
): Promise<AbeMinimal> {
  return abeExtractionService.extractFromText(rawText);
}

export { truncateAbeCoverPages } from "@/services/ocr/AbeExtractionService";
