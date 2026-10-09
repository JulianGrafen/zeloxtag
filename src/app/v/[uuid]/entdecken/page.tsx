import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { ShowcaseDiscoverIntro } from "@/components/showcase-swipe/showcase-discover-intro";
import { ShowcaseDiscoverExperience } from "@/components/showcase-swipe/showcase-discover-experience";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { buildOwnerShareableBuildData } from "@/lib/showcase/build-owner-shareable-build-data";
import {
  loadOwnerVehicleSwipeLikeCounts,
  loadShowcaseSwipeDeck,
} from "@/lib/showcase/swipe-deck";
import { loadVehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank";
import { topThreeWeeklyRankOrNull } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { loadWeeklyTopBuilds } from "@/lib/showcase/weekly-top-builds";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";

interface EntdeckenPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Builds entdecken · ZeloxTag",
    description: "Öffentliche Showcases swipen — Like oder Pass.",
  };
}

export default async function ShowcaseEntdeckenPage({
  params,
}: EntdeckenPageProps) {
  const { uuid } = await params;

  if (isDemoActiveTag(uuid)) {
    redirect(`/v/${uuid}`);
  }

  const { result } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/entdecken`,
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "showcase",
      },
    },
  });
  const vehicle = result.vehicle!;
  const scope = { vehicleId: vehicle.id, linkedTagUuid: uuid };

  const { isConfigured } = getSupabaseEnv();
  let initialCards: Awaited<ReturnType<typeof loadShowcaseSwipeDeck>> = [];
  let initialWeeklyBuilds: Awaited<ReturnType<typeof loadWeeklyTopBuilds>> = [];
  let ownSwipeTotalLikes = 0;
  let ownWeeklyRank: Awaited<
    ReturnType<typeof loadVehicleWeeklyShowcaseRank>
  > = null;
  let ownTopThreeShareCardData = null;
  if (isConfigured) {
    try {
      initialCards = await loadShowcaseSwipeDeck(15);
    } catch (error) {
      console.error("[entdecken] deck preload failed", error);
    }
    try {
      initialWeeklyBuilds = await loadWeeklyTopBuilds(10);
    } catch (error) {
      console.error("[entdecken] weekly top preload failed", error);
    }
    try {
      const counts = await loadOwnerVehicleSwipeLikeCounts(vehicle.id);
      ownSwipeTotalLikes = counts.totalLikes;
    } catch (error) {
      console.error("[entdecken] own swipe likes preload failed", error);
    }
    try {
      ownWeeklyRank = await loadVehicleWeeklyShowcaseRank(vehicle.id);
      if (
        ownWeeklyRank &&
        topThreeWeeklyRankOrNull(ownWeeklyRank.rank) != null
      ) {
        ownTopThreeShareCardData = buildOwnerShareableBuildData(
          vehicle,
          result.documents ?? [],
          ownWeeklyRank,
        );
      }
    } catch (error) {
      console.error("[entdecken] weekly rank preload failed", error);
    }
  }

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={uuid}
        title="Builds entdecken"
        description={
          <ShowcaseDiscoverIntro
            profilSettingsHref={vehicleSurfaceHref(scope, "einstellungen/profil")}
          />
        }
        backHref={`/v/${uuid}`}
        backLabel="Dashboard"
      >
        <ShowcaseDiscoverExperience
          tagUuid={uuid}
          initialCards={initialCards}
          initialWeeklyBuilds={initialWeeklyBuilds}
          ownSwipeTotalLikes={ownSwipeTotalLikes}
          isPublic={Boolean(vehicle.is_public)}
          showcaseSwipeOptIn={Boolean(vehicle.showcase_swipe_opt_in)}
          profilSettingsHref={vehicleSurfaceHref(scope, "einstellungen/profil")}
          ownWeeklyRank={ownWeeklyRank}
          ownTopThreeShareCardData={ownTopThreeShareCardData}
        />
        <LegalFooterNav className="pt-2" />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
