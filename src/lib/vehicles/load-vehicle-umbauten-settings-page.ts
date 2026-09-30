import "server-only";

import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";

export async function loadVehicleUmbautenSettingsPage(identifier: string) {
  const { vehicle, documents, isDemo } = await requireVehicleSettingsOwner(
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

  return {
    vehicle,
    documents,
    isDemo,
  };
}
