import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { topThreeWeeklyRankOrNull } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

type VehicleShowcaseStoryPassSubmenuProps = {
  surfaceScope: VehicleSurfaceScope;
  weeklyRank?: VehicleWeeklyShowcaseRank | null;
  variant?: "tile" | "group";
  isLast?: boolean;
};

export function VehicleShowcaseStoryPassSubmenu({
  surfaceScope,
  weeklyRank = null,
  variant = "tile",
  isLast = false,
}: VehicleShowcaseStoryPassSubmenuProps) {
  const topThree = topThreeWeeklyRankOrNull(weeklyRank?.rank ?? 0);
  const subtitle =
    topThree != null
      ? `Top ${topThree} · Story 9:16 und Post 3:4`
      : "Story 9:16 und Post 3:4 für Social";

  return (
    <VehicleSettingsSubmenuLink
      href={vehicleSurfaceHref(surfaceScope, "einstellungen/story-pass")}
      variant={variant}
      title="Showcase teilen"
      subtitle={subtitle}
      isLast={isLast}
    />
  );
}
