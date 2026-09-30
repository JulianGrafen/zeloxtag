import "server-only";

import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";

export async function loadVehicleSoundcheckSettingsPage(identifier: string) {
  const { vehicle, isDemo } = await requireVehicleSettingsOwner(identifier, {
    loginSuffix: "einstellungen/soundcheck",
  });

  return { vehicle, isDemo };
}
