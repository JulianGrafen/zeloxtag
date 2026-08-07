import { z } from "zod";

import {
  AbeApprovalDataSchema,
  EGBESchema,
  EinzelabnahmeSchema,
  TeilegutachtenSchema,
  TuevReportSchema,
  type AbeApprovalData,
  type EGBE,
  type Einzelabnahme,
  type Teilegutachten,
  type TuevReport,
} from "@/lib/validations/documentSchemas";

/**
 * Stored on `documents.approval_fields`.
 * `documents.type` stays `abe` | `tuev` — subtype lives here.
 */
export const APPROVAL_FIELD_KINDS = [
  "abe",
  "teilegutachten",
  "einzelabnahme",
  "egbe",
  "tuev",
] as const;

export type ApprovalFieldKind = (typeof APPROVAL_FIELD_KINDS)[number];

export type ApprovalFields =
  | { kind: "abe"; data?: AbeApprovalData }
  | { kind: "teilegutachten"; data: Teilegutachten }
  | { kind: "einzelabnahme"; data: Einzelabnahme }
  | { kind: "egbe"; data: EGBE }
  | { kind: "tuev"; data: TuevReport };

export const approvalFieldsSchema: z.ZodType<ApprovalFields> = z.discriminatedUnion(
  "kind",
  [
    z
      .object({
        kind: z.literal("abe"),
        data: AbeApprovalDataSchema.optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("teilegutachten"),
        data: TeilegutachtenSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("einzelabnahme"),
        data: EinzelabnahmeSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("egbe"),
        data: EGBESchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("tuev"),
        data: TuevReportSchema,
      })
      .strict(),
  ],
);

export const APPROVAL_KIND_LABELS: Record<ApprovalFieldKind, string> = {
  abe: "ABE",
  teilegutachten: "Teilegutachten",
  einzelabnahme: "Einzelabnahme",
  egbe: "EG-BE",
  tuev: "TÜV / HU",
};

export function parseApprovalFields(value: unknown): ApprovalFields | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return parseApprovalFields(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }
  const parsed = approvalFieldsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Kind-only fallback when subtype data failed validation. */
export function approvalKindOnly(
  kind: ApprovalFieldKind,
): ApprovalFields | null {
  if (kind === "abe") return { kind: "abe" };
  return null;
}

export function approvalKindLabel(
  fields: ApprovalFields | null | undefined,
): string {
  if (!fields) return APPROVAL_KIND_LABELS.abe;
  return APPROVAL_KIND_LABELS[fields.kind];
}
