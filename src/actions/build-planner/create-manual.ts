"use server";

import { z } from "zod";

import {
  revalidateBuildPlannerPaths,
  resolveBuildPlannerOwner,
} from "@/actions/build-planner/owner-access";
import {
  insertPlannedModWithTodos,
  nextPlannedModSortOrder,
} from "@/lib/build-planner/planned-mods-repository";
import { getSupabaseEnv } from "@/lib/supabase/env";

const inputSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().min(1).max(128).optional(),
  title: z.string().trim().min(2).max(160),
  plannedPriceEur: z.number().finite().min(0).max(999_999).nullable().optional(),
});

export type CreateManualPlannedModResult =
  | { status: "ok"; plannedModId: string }
  | { status: "error"; message: string };

export async function createPlannedModManual(
  raw: z.infer<typeof inputSchema>,
): Promise<CreateManualPlannedModResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Bitte einen Titel eingeben." };
  }

  const owner = await resolveBuildPlannerOwner(parsed.data.vehicleId);
  if (!owner.ok) {
    return { status: "error", message: owner.message };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Speichern ist lokal nicht verfügbar." };
  }

  const sortOrder = await nextPlannedModSortOrder(parsed.data.vehicleId);
  const inserted = await insertPlannedModWithTodos({
    vehicleId: parsed.data.vehicleId,
    userId: owner.ownerUserId,
    mod: {
      vehicle_id: parsed.data.vehicleId,
      user_id: owner.ownerUserId,
      status: "active",
      title: parsed.data.title,
      manufacturer: null,
      category: null,
      planned_price_eur: parsed.data.plannedPriceEur ?? null,
      source_url: null,
      source_kind: "manual",
      source_payload: null,
      ai_model: null,
      document_id: null,
      completed_at: null,
      sort_order: sortOrder,
    },
    todos: [],
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
