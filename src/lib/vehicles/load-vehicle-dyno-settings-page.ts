import "server-only";

import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";

export async function loadVehicleDynoSettingsPage(identifier: string) {
  const { vehicle, isDemo } = await requireVehicleSettingsOwner(identifier, {
    loginSuffix: "einstellungen/leistungsdiagramm",
  });

  return { vehicle, isDemo };
}
