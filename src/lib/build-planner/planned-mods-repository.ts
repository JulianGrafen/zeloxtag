import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BuildTodo, PlannedMod } from "@/types/database";

import type { PlannedModWithTodos } from "@/lib/build-planner/types";

export type PlannedModInsertResult =
  | { ok: true; mod: PlannedMod; todos: BuildTodo[] }
  | { ok: false; message: string };

function mapPlannedModInsertError(error: PostgrestError | null): string {
  if (!error) {
    return "Build konnte nicht gespeichert werden.";
  }

  const message = error.message.toLowerCase();
  const code = error.code ?? "";

  if (
    code === "42P01" ||
    (message.includes("planned_mods") &&
      (message.includes("does not exist") ||
        message.includes("schema cache") ||
        message.includes("could not find")))
  ) {
    return "Build Planner ist in Supabase noch nicht aktiv. Migration 00077_planned_mods_build_todos ausführen.";
  }

  if (code === "42501" || message.includes("row-level security")) {
    return "Speichern verweigert. Bitte neu anmelden oder Support kontaktieren.";
  }

  if (code === "23505") {
    return "Speichern fehlgeschlagen (Konflikt bei Schritt-Reihenfolge). Bitte erneut versuchen.";
  }

  if (code === "23503") {
    return "Fahrzeug nicht gefunden. Seite neu laden und erneut versuchen.";
  }

  return "Build konnte nicht gespeichert werden.";
}

async function getBuildPlannerWriteClient(): Promise<SupabaseClient> {
  if (isSupabaseAdminConfigured()) {
    return createAdminClient();
  }
  return await createClient();
}

function normalizeInsertTodos(
  todos: Array<{ title: string; sort_order: number; is_ai_generated: boolean }>,
): Array<{ title: string; sort_order: number; is_ai_generated: boolean }> {
  const rows: Array<{
    title: string;
    sort_order: number;
    is_ai_generated: boolean;
  }> = [];

  for (const todo of todos) {
    const title = todo.title.trim();
    if (title.length < 1) continue;
    rows.push({
      title: title.slice(0, 200),
      sort_order: rows.length,
      is_ai_generated: todo.is_ai_generated,
    });
  }

  return rows;
}

function mapPlannedMod(row: Record<string, unknown>): PlannedMod {
  return {
    id: String(row.id),
    vehicle_id: String(row.vehicle_id),
    user_id: String(row.user_id),
    status: row.status as PlannedMod["status"],
    title: String(row.title),
    manufacturer: row.manufacturer != null ? String(row.manufacturer) : null,
    category: row.category != null ? String(row.category) : null,
    planned_price_eur:
      row.planned_price_eur != null ? Number(row.planned_price_eur) : null,
    source_url: row.source_url != null ? String(row.source_url) : null,
    source_kind: row.source_kind as PlannedMod["source_kind"],
    source_payload:
      row.source_payload && typeof row.source_payload === "object"
        ? (row.source_payload as Record<string, unknown>)
        : null,
    ai_model: row.ai_model != null ? String(row.ai_model) : null,
    document_id: row.document_id != null ? String(row.document_id) : null,
    completed_at: row.completed_at != null ? String(row.completed_at) : null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapBuildTodo(row: Record<string, unknown>): BuildTodo {
  return {
    id: String(row.id),
    planned_mod_id: String(row.planned_mod_id),
    vehicle_id: String(row.vehicle_id),
    user_id: String(row.user_id),
    title: String(row.title),
    status: row.status as BuildTodo["status"],
    is_ai_generated: Boolean(row.is_ai_generated),
    sort_order: Number(row.sort_order ?? 0),
    completed_at: row.completed_at != null ? String(row.completed_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listPlannedModsWithTodosForVehicle(
  vehicleId: string,
): Promise<PlannedModWithTodos[]> {
  const supabase = await createClient();
  const { data: mods, error: modsError } = await supabase
    .from("planned_mods")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .in("status", ["draft", "active", "completed"])
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (modsError) {
    console.error("[build-planner] list mods failed", modsError);
    return [];
  }

  const modRows = (mods ?? []) as Record<string, unknown>[];
  if (modRows.length === 0) return [];

  const { data: todos, error: todosError } = await supabase
    .from("build_todos")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("sort_order", { ascending: true });

  if (todosError) {
    console.error("[build-planner] list todos failed", todosError);
    return modRows.map((row) => ({
      ...mapPlannedMod(row),
      todos: [],
    }));
  }

  const todoRows = (todos ?? []).map((row) =>
    mapBuildTodo(row as Record<string, unknown>),
  );
  const todosByMod = new Map<string, BuildTodo[]>();
  for (const todo of todoRows) {
    const list = todosByMod.get(todo.planned_mod_id) ?? [];
    list.push(todo);
    todosByMod.set(todo.planned_mod_id, list);
  }

  return modRows.map((row) => {
    const mod = mapPlannedMod(row);
    return {
      ...mod,
      todos: todosByMod.get(mod.id) ?? [],
    };
  });
}

export async function getPlannedModWithTodos(
  plannedModId: string,
): Promise<PlannedModWithTodos | null> {
  const supabase = await createClient();
  const { data: modRow, error } = await supabase
    .from("planned_mods")
    .select("*")
    .eq("id", plannedModId)
    .maybeSingle();

  if (error || !modRow) return null;

  const mod = mapPlannedMod(modRow as Record<string, unknown>);
  const { data: todoRows } = await supabase
    .from("build_todos")
    .select("*")
    .eq("planned_mod_id", plannedModId)
    .order("sort_order", { ascending: true });

  return {
    ...mod,
    todos: (todoRows ?? []).map((row) =>
      mapBuildTodo(row as Record<string, unknown>),
    ),
  };
}

export async function insertPlannedModWithTodos(input: {
  vehicleId: string;
  userId: string;
  mod: Omit<PlannedMod, "id" | "created_at" | "updated_at">;
  todos: Array<{ title: string; sort_order: number; is_ai_generated: boolean }>;
}): Promise<PlannedModInsertResult> {
  const supabase = await getBuildPlannerWriteClient();
  const todos = normalizeInsertTodos(input.todos);

  const { data: modRow, error: modError } = await supabase
    .from("planned_mods")
    .insert({
      vehicle_id: input.vehicleId,
      user_id: input.userId,
      status: input.mod.status,
      title: input.mod.title.trim(),
      manufacturer: input.mod.manufacturer,
      category: input.mod.category,
      planned_price_eur: input.mod.planned_price_eur,
      source_url: input.mod.source_url,
      source_kind: input.mod.source_kind,
      source_payload: input.mod.source_payload,
      ai_model: input.mod.ai_model,
      document_id: input.mod.document_id,
      completed_at: input.mod.completed_at,
      sort_order: input.mod.sort_order,
    })
    .select("*")
    .single();

  if (modError || !modRow) {
    console.error("[build-planner] insert mod failed", modError);
    return { ok: false, message: mapPlannedModInsertError(modError) };
  }

  const mod = mapPlannedMod(modRow as Record<string, unknown>);

  if (todos.length === 0) {
    return { ok: true, mod, todos: [] };
  }

  const { data: todoRows, error: todoError } = await supabase
    .from("build_todos")
    .insert(
      todos.map((todo) => ({
        planned_mod_id: mod.id,
        vehicle_id: input.vehicleId,
        user_id: input.userId,
        title: todo.title,
        status: "pending" as const,
        is_ai_generated: todo.is_ai_generated,
        sort_order: todo.sort_order,
      })),
    )
    .select("*");

  if (todoError) {
    console.error("[build-planner] insert todos failed", todoError);
    const { error: rollbackError } = await supabase
      .from("planned_mods")
      .delete()
      .eq("id", mod.id)
      .eq("user_id", input.userId);
    if (rollbackError) {
      console.error("[build-planner] rollback mod failed", rollbackError);
    }
    return { ok: false, message: mapPlannedModInsertError(todoError) };
  }

  return {
    ok: true,
    mod,
    todos: (todoRows ?? []).map((row) =>
      mapBuildTodo(row as Record<string, unknown>),
    ),
  };
}

export async function nextPlannedModSortOrder(
  vehicleId: string,
): Promise<number> {
  const supabase = await getBuildPlannerWriteClient();
  const { data } = await supabase
    .from("planned_mods")
    .select("sort_order")
    .eq("vehicle_id", vehicleId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || data.sort_order == null) return 0;
  return Number(data.sort_order) + 1;
}

export async function updateBuildTodoRow(input: {
  todoId: string;
  vehicleId: string;
  userId: string;
  title?: string;
  status?: BuildTodo["status"];
}): Promise<BuildTodo | null> {
  const supabase = await createClient();
  const patch: {
    title?: string;
    status?: BuildTodo["status"];
    completed_at?: string | null;
  } = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completed_at =
      input.status === "done" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("build_todos")
    .update(patch)
    .eq("id", input.todoId)
    .eq("vehicle_id", input.vehicleId)
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("[build-planner] update todo failed", error);
    return null;
  }

  return mapBuildTodo(data as Record<string, unknown>);
}

export async function insertBuildTodoRow(input: {
  plannedModId: string;
  vehicleId: string;
  userId: string;
  title: string;
  sortOrder: number;
}): Promise<BuildTodo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("build_todos")
    .insert({
      planned_mod_id: input.plannedModId,
      vehicle_id: input.vehicleId,
      user_id: input.userId,
      title: input.title.trim(),
      status: "pending",
      is_ai_generated: false,
      sort_order: input.sortOrder,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[build-planner] add todo failed", error);
    return null;
  }

  return mapBuildTodo(data as Record<string, unknown>);
}

export async function markPlannedModCompleted(input: {
  plannedModId: string;
  vehicleId: string;
  userId: string;
  documentId: string;
}): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("planned_mods")
    .update({
      status: "completed",
      document_id: input.documentId,
      completed_at: now,
    })
    .eq("id", input.plannedModId)
    .eq("vehicle_id", input.vehicleId)
    .eq("user_id", input.userId)
    .eq("status", "active");

  if (error) {
    console.error("[build-planner] complete mod failed", error);
    return false;
  }

  return true;
}
