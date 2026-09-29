import "server-only";

import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { loadShowcaseSwipeInboxSummary } from "@/lib/showcase/swipe-deck";
import { markShowcaseLikesSeen } from "@/lib/showcase/swipe-record";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";

export async function loadShowcaseSwipeInboxForVehicle(
  vehicleId: string,
  isDemo: boolean,
) {
  let showcaseSwipeTotalLikes = 0;
  let showcaseSwipeUnreadLikes = 0;

  if (!isDemo) {
    try {
      const inbox = await loadShowcaseSwipeInboxSummary();
      const row = inbox.find((entry) => entry.vehicleId === vehicleId);
      showcaseSwipeTotalLikes = row?.totalLikes ?? 0;
      showcaseSwipeUnreadLikes = row?.unreadLikes ?? 0;
      if (showcaseSwipeUnreadLikes > 0) {
        await markShowcaseLikesSeen({ vehicleId });
      }
    } catch (error) {
      console.error("[showcase-settings] inbox", error);
    }
  }

  return { showcaseSwipeTotalLikes, showcaseSwipeUnreadLikes };
}

export async function loadVehiclePublicProfileSettingsPage(tagUuid: string) {
  const { result, isDemoShowcase } = await requireTagOwner(tagUuid, {
    loginNext: `/v/${tagUuid}/einstellungen/profil`,
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(tagUuid);

  const { showcaseSwipeTotalLikes, showcaseSwipeUnreadLikes } =
    await loadShowcaseSwipeInboxForVehicle(vehicle.id, isDemo);

  return {
    vehicle,
    isDemo,
    hasLinkedTag: true,
    showcaseSwipeTotalLikes,
    showcaseSwipeUnreadLikes,
  };
}
