/**
 * Back-compat entry for ABE text parsing.
 * Implementation lives in {@link AbeParseService}.
 */

export { stripAbeFitmentSections } from "./abe-from-text";
export { abeParseService } from "./services/abe-parse-service";

import { abeParseService } from "./services/abe-parse-service";
import type { AbeCoreParseResult } from "./abe-parse-schema";

/** @deprecated Prefer `abeParseService.parseFromText`. */
export async function extractAbeFromText(
  rawText: string,
): Promise<AbeCoreParseResult> {
  return abeParseService.parseFromText(rawText);
}
