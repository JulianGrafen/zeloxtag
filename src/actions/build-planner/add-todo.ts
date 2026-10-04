"use server";

import { z } from "zod";

import {
  revalidateBuildPlannerPaths,
  resolveBuildPlannerOwner,
} from "@/actions/build-planner/owner-access";
import {
  getPlannedModWithTodos,
  insertBuildTodoRow,
} from "@/lib/build-planner/planned-mods-repository";

const inputSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().min(1).max(128).optional(),
  plannedModId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

export type AddBuildTodoResult =
  | { status: "ok"; todoId: string }
  | { status: "error"; message: string };

export async function addBuildTodo(
  raw: z.infer<typeof inputSchema>,
): Promise<AddBuildTodoResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Bitte einen Schritt eingeben." };
  }

  const owner = await resolveBuildPlannerOwner(parsed.data.vehicleId);
  if (!owner.ok) {
    return { status: "error", message: owner.message };
  }

  const mod = await getPlannedModWithTodos(parsed.data.plannedModId);
  if (!mod || mod.vehicle_id !== parsed.data.vehicleId) {
    return { status: "error", message: "Build nicht gefunden." };
  }

  if (mod.status !== "active" && mod.status !== "draft") {
    return { status: "error", message: "Abgeschlossene Builds sind read-only." };
  }

  const nextSort =
    mod.todos.reduce((max, todo) => Math.max(max, todo.sort_order), -1) + 1;

  const todo = await insertBuildTodoRow({
    plannedModId: parsed.data.plannedModId,
    vehicleId: parsed.data.vehicleId,
    userId: owner.userId,
    title: parsed.data.title,
    sortOrder: nextSort,
  });

  if (!todo) {
    return { status: "error", message: "Schritt konnte nicht hinzugefügt werden." };
  }

  await revalidateBuildPlannerPaths(
    parsed.data.vehicleId,
    parsed.data.tagUuid,
  );

  return { status: "ok", todoId: todo.id };
}
