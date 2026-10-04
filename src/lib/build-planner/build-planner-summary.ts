import type { BuildTodo, PlannedMod } from "@/types/database";

import type { BuildPlannerSummary } from "@/lib/build-planner/types";

const ACTIVE_STATUSES = new Set<PlannedMod["status"]>(["draft", "active"]);

export function buildBuildPlannerSummary(input: {
  mods: PlannedMod[];
  todos: BuildTodo[];
  spentEur: number;
}): BuildPlannerSummary {
  const activeMods = input.mods.filter((mod) => ACTIVE_STATUSES.has(mod.status));

  const plannedTotalEur = roundMoney(
    activeMods.reduce((sum, mod) => sum + (mod.planned_price_eur ?? 0), 0),
  );

  const activeModIds = new Set(activeMods.map((mod) => mod.id));
  const relevantTodos = input.todos.filter((todo) =>
    activeModIds.has(todo.planned_mod_id),
  );

  const totalTodos = relevantTodos.length;
  const doneTodos = relevantTodos.filter((todo) => todo.status === "done").length;
  const pendingTodoCount = totalTodos - doneTodos;

  const buildProgressPct =
    totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;

  return {
    plannedTotalEur,
    spentEur: roundMoney(input.spentEur),
    buildProgressPct,
    activeModCount: activeMods.length,
    pendingTodoCount,
  };
}

export function buildPlannerDashboardHint(input: {
  mods: PlannedMod[];
  todos: BuildTodo[];
}): { subtitle: string } {
  const summary = buildBuildPlannerSummary({
    mods: input.mods,
    todos: input.todos,
    spentEur: 0,
  });

  if (summary.activeModCount === 0) {
    return { subtitle: "Build planen" };
  }

  return {
    subtitle: `${summary.activeModCount} geplant · ${summary.buildProgressPct}%`,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
