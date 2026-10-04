"use server";

import { z } from "zod";

import {
  revalidateBuildPlannerPaths,
  resolveBuildPlannerOwner,
} from "@/actions/build-planner/owner-access";
import { insertTuningDocumentFromPlannedMod } from "@/lib/build-planner/promote-to-garage";
import {
  getPlannedModWithTodos,
  markPlannedModCompleted,
} from "@/lib/build-planner/planned-mods-repository";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const inputSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().min(1).max(128).optional(),
  plannedModId: z.string().uuid(),
  showOnPublicShowcase: z.boolean(),
});

export type CompletePlannedModResult =
  | { status: "ok"; documentId: string }
  | { status: "error"; message: string; code?: "already_completed" | "todos_pending" };

export async function completePlannedMod(
  raw: z.infer<typeof inputSchema>,
): Promise<CompletePlannedModResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  const owner = await resolveBuildPlannerOwner(parsed.data.vehicleId);
  if (!owner.ok) {
    return { status: "error", message: owner.message };
  }

  const mod = await getPlannedModWithTodos(parsed.data.plannedModId);
  if (!mod || mod.vehicle_id !== parsed.data.vehicleId) {
    return { status: "error", message: "Build nicht gefunden." };
  }

  if (mod.status === "completed") {
    return {
      status: "error",
      message: "Dieser Build wurde bereits übernommen.",
      code: "already_completed",
    };
  }

  if (mod.status !== "active") {
    return { status: "error", message: "Nur aktive Builds können abgeschlossen werden." };
  }

  const pending = mod.todos.filter((todo) => todo.status !== "done").length;
  if (pending > 0) {
    return {
      status: "error",
      message: "Bitte alle Schritte erledigen, bevor du übernimmst.",
      code: "todos_pending",
    };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Speichern ist lokal nicht verfügbar." };
  }

  const supabase = await createClient();
  const doc = await insertTuningDocumentFromPlannedMod(supabase, {
    mod,
    ownerUserId: owner.ownerUserId,
    sessionUserId: owner.userId,
    showOnPublicShowcase: parsed.data.showOnPublicShowcase,
  });

  if ("error" in doc) {
    return { status: "error", message: doc.error };
  }

  const completed = await markPlannedModCompleted({
    plannedModId: mod.id,
    vehicleId: parsed.data.vehicleId,
    userId: owner.userId,
    documentId: doc.documentId,
  });

  if (!completed) {
    return {
      status: "error",
      message: "Garage-Eintrag erstellt, Status-Update fehlgeschlagen.",
    };
  }

  await revalidateBuildPlannerPaths(
    parsed.data.vehicleId,
    parsed.data.tagUuid,
    doc.documentId,
  );

  return { status: "ok", documentId: doc.documentId };
}
