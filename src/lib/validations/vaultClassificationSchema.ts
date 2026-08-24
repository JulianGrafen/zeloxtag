import { z } from "zod";

/** Broad part categories for the Dokumenten-Tresor filter UI. */
export const VAULT_CATEGORIES = [
  "FAHRWERK",
  "RÄDER_FELGEN",
  "AERODYNAMIK_KAROSSERIE",
  "MOTOR_ABGAS_ANSAUGUNG",
  "SONSTIGES",
] as const;

export type VaultCategory = (typeof VAULT_CATEGORIES)[number];

export const VAULT_CATEGORY_LABELS: Record<VaultCategory, string> = {
  FAHRWERK: "Fahrwerk",
  RÄDER_FELGEN: "Felgen",
  AERODYNAMIK_KAROSSERIE: "Karosserie",
  MOTOR_ABGAS_ANSAUGUNG: "Motor & Auspuff",
  SONSTIGES: "Sonstiges",
};

/** Stored on `documents.category` to mark Tresor uploads. */
export const VAULT_DOCUMENT_TYPE_MARKER = "GUTACHTEN_ABE" as const;

export const vaultClassificationSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .describe(
        "Short, precise name of the modified part (e.g., 'KW V3 Gewindefahrwerk', 'Maxton Heckspoiler', 'Eventuri Ansaugung').",
      ),
    category: z
      .enum(VAULT_CATEGORIES)
      .describe("Broad category of the part for filtering."),
  })
  .strict();

export type VaultClassification = z.infer<typeof vaultClassificationSchema>;

export const VAULT_CLASSIFICATION_JSON_SCHEMA = {
  name: "vault_classification",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "category"],
    properties: {
      title: {
        type: "string",
        description:
          "Short part name only — no dates, prices, or paragraph references.",
      },
      category: {
        type: "string",
        enum: [...VAULT_CATEGORIES],
      },
    },
  },
} as const;

const VaultClassificationLlmSchema = z
  .object({
    title: z.string(),
    category: z.enum(VAULT_CATEGORIES),
  })
  .strict();

export function normalizeVaultClassification(
  payload: unknown,
): VaultClassification {
  const parsed = VaultClassificationLlmSchema.parse(payload);
  const title = parsed.title.trim();
  if (!title) {
    throw new Error("title is required");
  }
  return vaultClassificationSchema.parse({
    title,
    category: parsed.category,
  });
}

export function isVaultCategory(value: string | null | undefined): value is VaultCategory {
  if (!value) return false;
  return (VAULT_CATEGORIES as readonly string[]).includes(value);
}
