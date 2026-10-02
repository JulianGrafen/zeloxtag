import "server-only";

import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";

export async function loadVehicleDynoSettingsPage(identifier: string) {
  const { vehicle, isDemo, scope } = await requireVehicleSettingsOwner(
    identifier,
    {
      loginSuffix: "einstellungen/leistungsdiagramm",
    },
  );

  return { vehicle, isDemo, scope };
}
