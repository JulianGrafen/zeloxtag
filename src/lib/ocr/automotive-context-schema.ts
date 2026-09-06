import { z } from "zod";

export const AUTOMOTIVE_REJECTION_MESSAGE =
  "Upload abgelehnt: Das Dokument scheint keinen Kfz-Bezug zu haben.";

export const AUTOMOTIVE_REJECTION_CODE = "document_rejected" as const;

export const automotiveContextSchema = z
  .object({
    isAutomotiveRelated: z.boolean(),
    reason: z.string().nullable(),
  })
  .strict();

export type AutomotiveContextResult = z.infer<typeof automotiveContextSchema>;

export const AUTOMOTIVE_CONTEXT_JSON_SCHEMA = {
  name: "automotive_context",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["isAutomotiveRelated", "reason"],
    properties: {
      isAutomotiveRelated: {
        type: "boolean",
        description:
          "True when the document relates to automotive parts, vehicle maintenance, tuning, TÜV reports, or car registrations.",
      },
      reason: {
        type: ["string", "null"],
        description:
          "Short German explanation when rejected; null when accepted.",
      },
    },
  },
} as const;

export function normalizeAutomotiveContext(payload: unknown): AutomotiveContextResult {
  const parsed = automotiveContextSchema.parse(payload);
  const reason =
    parsed.reason === null
      ? null
      : parsed.reason.trim().length > 0
        ? parsed.reason.trim().slice(0, 240)
        : null;
  return {
    isAutomotiveRelated: parsed.isAutomotiveRelated,
    reason,
  };
}
