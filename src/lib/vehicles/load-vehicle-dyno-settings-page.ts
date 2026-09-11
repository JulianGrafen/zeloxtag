import "server-only";

import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";

export async function loadVehicleDynoSettingsPage(tagUuid: string) {
  const { result, isDemoShowcase } = await requireTagOwner(tagUuid, {
    loginNext: `/v/${tagUuid}/einstellungen/leistungsdiagramm`,
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(tagUuid);

  return { vehicle, isDemo };
}
