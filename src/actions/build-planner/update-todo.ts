"use server";

import { z } from "zod";

import {
  revalidateBuildPlannerPaths,
  resolveBuildPlannerOwner,
} from "@/actions/build-planner/owner-access";
import { updateBuildTodoRow } from "@/lib/build-planner/planned-mods-repository";

const inputSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().min(1).max(128).optional(),
  todoId: z.string().uuid(),
  status: z.enum(["pending", "done"]).optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

export type UpdateBuildTodoResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function updateBuildTodo(
  raw: z.infer<typeof inputSchema>,
): Promise<UpdateBuildTodoResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  if (!parsed.data.status && !parsed.data.title) {
    return { status: "error", message: "Nichts zu aktualisieren." };
  }

  const owner = await resolveBuildPlannerOwner(parsed.data.vehicleId);
  if (!owner.ok) {
    return { status: "error", message: owner.message };
  }

  const updated = await updateBuildTodoRow({
    todoId: parsed.data.todoId,
    vehicleId: parsed.data.vehicleId,
    userId: owner.userId,
    status: parsed.data.status,
    title: parsed.data.title,
  });

  if (!updated) {
    return { status: "error", message: "Schritt konnte nicht gespeichert werden." };
  }

  await revalidateBuildPlannerPaths(
    parsed.data.vehicleId,
    parsed.data.tagUuid,
  );

  return { status: "ok" };
}
