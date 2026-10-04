import { z } from "zod";

import { BUILD_PLANNER_LLM_CATEGORIES } from "@/lib/build-planner/extract-prompt";
import { SPEND_BUCKETS } from "@/lib/documents/cost-overview";
import { normalizePlannedModExtractRaw } from "@/lib/build-planner/normalize-extract";

const spendBucketSchema = z.enum(SPEND_BUCKETS);

export const plannedModExtractPartSchema = z.object({
  title: z.string().trim().min(2).max(160),
  manufacturer: z.string().trim().max(120).nullable().optional(),
  category: spendBucketSchema.nullable().optional(),
  plannedPriceEur: z.number().finite().min(0).max(999_999).nullable().optional(),
  productUrl: z.string().trim().url().max(2048).nullable().optional(),
});

export const plannedModExtractTodoSchema = z.object({
  title: z.string().trim().min(2).max(200),
  sortOrder: z.number().int().min(0).max(99),
});

export const plannedModExtractResultSchema = z.object({
  part: plannedModExtractPartSchema,
  todos: z.array(plannedModExtractTodoSchema).min(3).max(14),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string().trim().min(1).max(240)).max(8),
});

export type PlannedModExtractResult = z.infer<typeof plannedModExtractResultSchema>;

export const BUILD_PLANNER_EXTRACT_JSON_SCHEMA = {
  name: "build_planner_extract",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "category", "estimated_price", "todos"],
    properties: {
      title: { type: "string" },
      category: {
        type: "string",
        enum: [...BUILD_PLANNER_LLM_CATEGORIES],
      },
      estimated_price: { type: "number" },
      todos: {
        type: "array",
        minItems: 3,
        maxItems: 14,
        items: { type: "string" },
      },
    },
  },
} as const;

export function parsePlannedModExtractResult(
  value: unknown,
): PlannedModExtractResult | null {
  const normalized = normalizePlannedModExtractRaw(value);
  const parsed = plannedModExtractResultSchema.safeParse(normalized);
  if (parsed.success) return parsed.data;

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[build-planner] extract validation failed",
      parsed.error.flatten(),
    );
  }
  return null;
}
