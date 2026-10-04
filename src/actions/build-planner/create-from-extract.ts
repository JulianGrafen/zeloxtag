"use server";

import { z } from "zod";

import { resolveBuildPlannerOwner, revalidateBuildPlannerPaths } from "@/actions/build-planner/owner-access";
import {
  insertPlannedModWithTodos,
  nextPlannedModSortOrder,
} from "@/lib/build-planner/planned-mods-repository";
import { parsePlannedModExtractResult } from "@/lib/build-planner/extract-schema";
import type { PlannedModSourceKind } from "@/types/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

const inputSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().min(1).max(128).optional(),
  extract: z.unknown(),
  sourceKind: z.enum(["link", "image", "text"]),
  sourceUrl: z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    return value.trim();
  }, z.string().url().max(2048).optional()),
  aiModel: z.string().trim().max(120).optional(),
});

export type CreateFromExtractResult =
  | { status: "ok"; plannedModId: string }
  | { status: "error"; message: string };

export async function createPlannedModFromExtract(
  raw: z.infer<typeof inputSchema>,
): Promise<CreateFromExtractResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Ungültige Eingabe." };
  }

  const owner = await resolveBuildPlannerOwner(parsed.data.vehicleId);
  if (!owner.ok) {
    return { status: "error", message: owner.message };
  }

  const extract = parsePlannedModExtractResult(parsed.data.extract);
  if (!extract) {
    return {
      status: "error",
      message:
        "Vorschau konnte nicht gespeichert werden. Bitte Titel und mindestens drei Schritte prüfen.",
    };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Speichern ist lokal nicht verfügbar." };
  }

  const sortOrder = await nextPlannedModSortOrder(parsed.data.vehicleId);
  const part = extract.part;
  const sourceKind = parsed.data.sourceKind as PlannedModSourceKind;

  const inserted = await insertPlannedModWithTodos({
    vehicleId: parsed.data.vehicleId,
    userId: owner.ownerUserId,
    mod: {
      vehicle_id: parsed.data.vehicleId,
      user_id: owner.ownerUserId,
      status: "active",
      title: part.title,
      manufacturer: part.manufacturer ?? null,
      category: part.category ?? null,
      planned_price_eur: part.plannedPriceEur ?? null,
      source_url: part.productUrl ?? parsed.data.sourceUrl ?? null,
      source_kind: sourceKind,
      source_payload: { extract },
      ai_model: parsed.data.aiModel ?? null,
      document_id: null,
      completed_at: null,
      sort_order: sortOrder,
    },
    todos: extract.todos.map((todo) => ({
      title: todo.title,
      sort_order: todo.sortOrder,
      is_ai_generated: true,
    })),
  });

  if (!inserted.ok) {
    return { status: "error", message: inserted.message };
  }

  await revalidateBuildPlannerPaths(
    parsed.data.vehicleId,
    parsed.data.tagUuid,
  );

  return { status: "ok", plannedModId: inserted.mod.id };
}
