import type { Metadata } from "next";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";

import { AppShell } from "@/components/layout/app-shell";
import { VehiclePublicProfileSettings } from "@/components/vehicles/vehicle-public-profile-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadShowcaseSwipeInboxForVehicle } from "@/lib/vehicles/load-vehicle-public-profile-settings-page";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { ZELOX_TAG_PRODUCT_URL } from "@/lib/hardware/zelox-tag-product-url";

interface PublicProfileSettingsPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Öffentliches Profil · ZeloxTag",
    description: "Showcase, Build-Swipe und Share-Link verwalten.",
  };
}

export default async function VehiclePublicProfileSettingsPage({
  params,
}: PublicProfileSettingsPageProps) {
  const { vehicleId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner(
    { vehicleId },
    {
      loginNext: `/garage/${vehicleId}/einstellungen/profil`,
    },
  );
  const vehicle = result.vehicle!;
  const hasLinkedTag = Boolean(scope.linkedTagUuid?.trim());
  const isDemo =
    Boolean(isDemoShowcase) || isDemoActiveTag(scope.linkedTagUuid ?? "");
  const { showcaseSwipeTotalLikes, showcaseSwipeUnreadLikes } =
    await loadShowcaseSwipeInboxForVehicle(vehicle.id, isDemo);

  const settingsBackHref = vehicleSurfaceHref(scope, "einstellungen");
  const description = hasLinkedTag
    ? "Showcase-Seite mit Share-Link — sichtbar für Besucher, wenn das Profil öffentlich ist."
    : "Showcase-Inhalte und Build-Swipe — ein eigener Share-Link gibt es mit einem verknüpften Zelox Tag.";

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        backHref={settingsBackHref}
        title="Öffentliches Profil"
        description={description}
      >
        <VehiclePublicProfileSettings
          tagUuid={scope.linkedTagUuid ?? undefined}
          vehicleId={vehicle.id}
          isPublic={Boolean(vehicle.is_public)}
          hideFinancials={vehicle.hide_financials !== false}
          showcaseSwipeOptIn={Boolean(vehicle.showcase_swipe_opt_in)}
          publicSlug={vehicle.public_slug}
          canEdit={!isDemo}
          hasLinkedTag={hasLinkedTag}
          tagShopUrl={ZELOX_TAG_PRODUCT_URL}
          showcaseSwipeTotalLikes={showcaseSwipeTotalLikes}
          showcaseSwipeUnreadLikes={showcaseSwipeUnreadLikes}
        />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
