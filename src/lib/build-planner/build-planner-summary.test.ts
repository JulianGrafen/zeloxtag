import { describe, expect, it } from "vitest";

import {
  buildBuildPlannerSummary,
  buildPlannerDashboardHint,
} from "@/lib/build-planner/build-planner-summary";
import type { BuildTodo, PlannedMod } from "@/types/database";

const baseMod = (overrides: Partial<PlannedMod>): PlannedMod => ({
  id: overrides.id ?? "mod-1",
  vehicle_id: "veh-1",
  user_id: "user-1",
  status: overrides.status ?? "active",
  title: overrides.title ?? "Test",
  manufacturer: null,
  category: null,
  planned_price_eur: overrides.planned_price_eur ?? 100,
  source_url: null,
  source_kind: "manual",
  source_payload: null,
  ai_model: null,
  document_id: null,
  completed_at: null,
  sort_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const todo = (overrides: Partial<BuildTodo>): BuildTodo => ({
  id: overrides.id ?? "todo-1",
  planned_mod_id: overrides.planned_mod_id ?? "mod-1",
  vehicle_id: "veh-1",
  user_id: "user-1",
  title: overrides.title ?? "Step",
  status: overrides.status ?? "pending",
  is_ai_generated: true,
  sort_order: 0,
  completed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

describe("buildBuildPlannerSummary", () => {
  it("sums planned prices and progress", () => {
    const mods = [
      baseMod({ id: "m1", planned_price_eur: 200 }),
      baseMod({ id: "m2", planned_price_eur: 50, status: "completed" }),
    ];
    const todos = [
      todo({ id: "t1", planned_mod_id: "m1", status: "done" }),
      todo({ id: "t2", planned_mod_id: "m1", status: "pending" }),
    ];

    const summary = buildBuildPlannerSummary({
      mods,
      todos,
      spentEur: 1200.5,
    });

    expect(summary.plannedTotalEur).toBe(200);
    expect(summary.spentEur).toBe(1200.5);
    expect(summary.buildProgressPct).toBe(50);
    expect(summary.activeModCount).toBe(1);
    expect(summary.pendingTodoCount).toBe(1);
  });
});

describe("buildPlannerDashboardHint", () => {
  it("returns default when empty", () => {
    expect(
      buildPlannerDashboardHint({ mods: [], todos: [] }).subtitle,
    ).toBe("Build planen");
  });
});
