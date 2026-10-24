import "server-only";

import { loadVehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";

export async function loadVehicleUmbautenSettingsPage(identifier: string) {
  const { vehicle, documents, isDemo, scope } = await requireVehicleSettingsOwner(
    identifier,
    {
      loginSuffix: "einstellungen/umbauten",
      load: {
        documents: {
          mode: "types",
          types: ["invoice"],
          columns: "showcase",
        },
      },
    },
  );

  const { isConfigured } = getSupabaseEnv();
  let weeklyRank: Awaited<ReturnType<typeof loadVehicleWeeklyShowcaseRank>> =
    null;

  if (isConfigured && !isDemo) {
    try {
      weeklyRank = await loadVehicleWeeklyShowcaseRank(vehicle.id);
    } catch (error) {
      console.error("[umbauten-settings] weekly rank preload failed", error);
    }
  }

  return {
    vehicle,
    documents,
    isDemo,
    scope,
    weeklyRank,
  };
}
