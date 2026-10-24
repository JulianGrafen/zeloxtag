import "server-only";

import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";

export async function loadVehicleStoryPassSettingsPage(identifier: string) {
  const { vehicle, documents, isDemo, scope } = await requireVehicleSettingsOwner(
    identifier,
    {
      loginSuffix: "einstellungen/story-pass",
      load: {
        documents: {
          mode: "types",
          types: ["invoice"],
          columns: "showcase",
        },
      },
    },
  );

  return {
    vehicle,
    documents,
    isDemo,
    scope,
  };
}
