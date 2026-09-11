import "server-only";

import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";

export async function loadVehicleSoundcheckSettingsPage(tagUuid: string) {
  const { result, isDemoShowcase } = await requireTagOwner(tagUuid, {
    loginNext: `/v/${tagUuid}/einstellungen/soundcheck`,
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(tagUuid);

  return { vehicle, isDemo };
}
