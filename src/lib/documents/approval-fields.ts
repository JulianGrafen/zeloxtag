import { z } from "zod";

import {
  AbeApprovalDataSchema,
  EGBESchema,
  EinzelabnahmeSchema,
  Pruefung192Schema,
  TeilegutachtenSchema,
  TuevReportSchema,
  type AbeApprovalData,
  type EGBE,
  type Einzelabnahme,
  type Pruefung192,
  type Teilegutachten,
  type TuevReport,
} from "@/lib/validations/documentSchemas";
import {
  VAULT_CATEGORIES,
  VAULT_DOCUMENT_KINDS,
  type VaultCategory,
  type VaultDocumentKind,
} from "@/lib/validations/vaultClassificationSchema";
import {
  gutachtenExtractionSchema,
  type GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";

export type Gutachten = GutachtenExtraction;
export const GutachtenSchema = gutachtenExtractionSchema;

export const VaultDocumentSchema = z
  .object({
    category: z.enum(VAULT_CATEGORIES),
    documentKind: z.enum(VAULT_DOCUMENT_KINDS).nullable().optional(),
  })
  .strict();

export type VaultDocument = z.infer<typeof VaultDocumentSchema>;

/**
 * Stored on `documents.approval_fields`.
 * `documents.type` stays `abe` | `tuev` — subtype lives here.
 */
export const APPROVAL_FIELD_KINDS = [
  "abe",
  "gutachten",
  "teilegutachten",
  "einzelabnahme",
  "pruefung192",
  "egbe",
  "tuev",
  "vault",
] as const;

export type ApprovalFieldKind = (typeof APPROVAL_FIELD_KINDS)[number];

export type ApprovalFields =
  | { kind: "abe"; data?: AbeApprovalData }
  | { kind: "gutachten"; data: Gutachten }
  | { kind: "teilegutachten"; data: Teilegutachten }
  | { kind: "einzelabnahme"; data: Einzelabnahme }
  | { kind: "pruefung192"; data: Pruefung192 }
  | { kind: "egbe"; data: EGBE }
  | { kind: "tuev"; data: TuevReport }
  | { kind: "vault"; data: VaultDocument };

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
        kind: z.literal("gutachten"),
        data: GutachtenSchema,
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
        kind: z.literal("pruefung192"),
        data: Pruefung192Schema,
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
    z
      .object({
        kind: z.literal("vault"),
        data: VaultDocumentSchema,
      })
      .strict(),
  ],
);

export const APPROVAL_KIND_LABELS: Record<ApprovalFieldKind, string> = {
  abe: "ABE",
  gutachten: "Gutachten",
  teilegutachten: "Teilegutachten",
  einzelabnahme: "Einzelabnahme",
  pruefung192: "§19(2) Prüfung",
  egbe: "EG-BE",
  tuev: "TÜV / HU",
  vault: "Tresor",
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
