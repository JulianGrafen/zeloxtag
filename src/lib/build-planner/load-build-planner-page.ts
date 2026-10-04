import "server-only";

import { buildVehicleCostOverview } from "@/lib/documents/cost-overview";
import { buildBuildPlannerSummary } from "@/lib/build-planner/build-planner-summary";
import { listPlannedModsWithTodosForVehicle } from "@/lib/build-planner/planned-mods-repository";
import type { BuildPlannerPageData } from "@/lib/build-planner/types";
import type { Document } from "@/types/database";

export async function loadBuildPlannerPageData(
  vehicleId: string,
  documents: Document[],
): Promise<BuildPlannerPageData> {
  const mods = await listPlannedModsWithTodosForVehicle(vehicleId);
  const todos = mods.flatMap((mod) => mod.todos);
  const costOverview = buildVehicleCostOverview(documents);

  const summary = buildBuildPlannerSummary({
    mods,
    todos,
    spentEur: costOverview.modification.total,
  });

  return { mods, summary };
}
