import type { BuildTodo, PlannedMod } from "@/types/database";

export type PlannedModWithTodos = PlannedMod & {
  todos: BuildTodo[];
};

export type BuildPlannerPageData = {
  mods: PlannedModWithTodos[];
  summary: BuildPlannerSummary;
};

export type BuildPlannerSummary = {
  plannedTotalEur: number;
  spentEur: number;
  buildProgressPct: number;
  activeModCount: number;
  pendingTodoCount: number;
};
