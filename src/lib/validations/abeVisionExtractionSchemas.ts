import { z } from "zod";

import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";
import { normalizeAbeKbaDigits } from "@/lib/validations/abeSchema";

/** Strict vision-LLM response for ABE document pages. */
export const AbeVisionExtractionSchema = z
  .object({
    kba_number: z.string().nullable(),
    part_type: z.string().nullable(),
    auflagen: z.array(z.string()),
    confidence_score: z.number().int().min(1).max(100),
  })
  .strict();

export type AbeVisionExtraction = z.infer<typeof AbeVisionExtractionSchema>;

export const ABE_VISION_EXTRACTION_JSON_SCHEMA = {
  name: "abe_vision_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["kba_number", "part_type", "auflagen", "confidence_score"],
    properties: {
      kba_number: {
        type: ["string", "null"],
        description:
          "4- or 5-digit KBA (Kraftfahrt-Bundesamt) number, digits only when possible.",
      },
      part_type: {
        type: ["string", "null"],
        description:
          "Part category on the ABE, e.g. Felge, Fahrwerk, Spoiler.",
      },
      auflagen: {
        type: "array",
        items: { type: "string" },
        description:
          "Restriction codes relevant to the vehicle table, e.g. A01, K2b.",
      },
      confidence_score: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "1-100 readability confidence; lower when text is unclear.",
      },
    },
  },
} as const;

export const ABE_VISION_SYSTEM_PROMPT =
  "You are a German TÜV automotive document expert. Analyze the provided document pages. " +
  "Extract the following as strict JSON:\n" +
  "1. `kba_number`: The 4- or 5-digit KBA (Kraftfahrt-Bundesamt) number.\n" +
  "2. `part_type`: e.g., 'Felge', 'Fahrwerk', 'Spoiler'.\n" +
  "3. `auflagen`: An array of restriction codes (e.g., ['A01', 'K2b']) relevant to the vehicle table shown.\n" +
  "4. `confidence_score`: 1-100 based on readability.\n" +
  "If a value is completely unreadable, return null, do not hallucinate.";

export const ABE_VISION_CONFIDENCE_WARNING_THRESHOLD = 80;

export function parseAuflagenCodeInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,;\s]+/)
        .map((part) => normalizeAuflagenKuerzel(part))
        .filter(Boolean),
    ),
  );
}

export function emptyAbeVisionExtraction(): AbeVisionExtraction {
  return {
    kba_number: null,
    part_type: null,
    auflagen: [],
    confidence_score: 1,
  };
}

export function normalizeAbeVisionExtraction(
  raw: AbeVisionExtraction,
): AbeVisionExtraction {
  const kbaDigits = normalizeAbeKbaDigits(raw.kba_number ?? "");
  return {
    kba_number: kbaDigits || null,
    part_type: raw.part_type?.trim() || null,
    auflagen: Array.from(
      new Set(
        raw.auflagen
          .map((code) => normalizeAuflagenKuerzel(code))
          .filter(Boolean),
      ),
    ),
    confidence_score: Math.min(100, Math.max(1, raw.confidence_score)),
  };
}

/** True when the model returned nothing usable — triggers manual fallback UI. */
export function isAbeVisionExtractionEmpty(
  extraction: AbeVisionExtraction,
): boolean {
  const normalized = normalizeAbeVisionExtraction(extraction);
  return (
    !normalized.kba_number &&
    !normalized.part_type &&
    normalized.auflagen.length === 0
  );
}

export type AbeExtractionFormValues = {
  kbaNumber: string;
  partType: string;
  auflagenCodes: string;
};

export function formValuesFromVisionExtraction(
  extraction: AbeVisionExtraction,
): AbeExtractionFormValues {
  const normalized = normalizeAbeVisionExtraction(extraction);
  return {
    kbaNumber: normalized.kba_number ?? "",
    partType: normalized.part_type ?? "",
    auflagenCodes: normalized.auflagen.join(" "),
  };
}

export function emptyAbeExtractionFormValues(): AbeExtractionFormValues {
  return { kbaNumber: "", partType: "", auflagenCodes: "" };
}
