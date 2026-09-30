import "server-only";

import { loadShowcaseSwipeInboxSummary } from "@/lib/showcase/swipe-deck";
import { markShowcaseLikesSeen } from "@/lib/showcase/swipe-record";
import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";

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

export async function loadVehiclePublicProfileSettingsPage(identifier: string) {
  const { vehicle, scope, isDemo } = await requireVehicleSettingsOwner(
    identifier,
    {
      loginSuffix: "einstellungen/profil",
    },
  );

  const { showcaseSwipeTotalLikes, showcaseSwipeUnreadLikes } =
    await loadShowcaseSwipeInboxForVehicle(vehicle.id, isDemo);

  return {
    vehicle,
    isDemo,
    hasLinkedTag: Boolean(scope.linkedTagUuid?.trim()),
    showcaseSwipeTotalLikes,
    showcaseSwipeUnreadLikes,
  };
}
