import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { discoverPageRootClassName } from "@/components/showcase-swipe/discover-minimal/discover-surface-styles";
import { ShowcaseDiscoverExperience } from "@/components/showcase-swipe/showcase-discover-experience";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { getTagVehicleAccess } from "@/lib/auth/vehicle-access";
import { buildOwnerShareableBuildData } from "@/lib/showcase/build-owner-shareable-build-data";
import { loadShowcaseSwipeDeck } from "@/lib/showcase/swipe-deck";
import { loadVehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats";
import { loadVehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank";
import { topThreeWeeklyRankOrNull } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { loadPendingWeeklyRankAwardForVehicle } from "@/lib/showcase/load-weekly-rank-award";
import { loadWeeklyTopBuilds } from "@/lib/showcase/weekly-top-builds";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getTagByUuid, type TagLoadOptions } from "@/lib/tags/get-tag-by-uuid";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { resolveVehicleIdScanMisroute } from "@/lib/vehicle-surface/resolve-vehicle-id-scan-misroute";
import {
  garagePathForVehicle,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";

interface EntdeckenPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ weeklyAward?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Builds entdecken · ZeloxTag",
    description: "Öffentliche Showcases swipen — Like oder Pass.",
  };
}

export default async function ShowcaseEntdeckenPage({
  params,
  searchParams,
}: EntdeckenPageProps) {
  const { uuid } = await params;
  const { weeklyAward } = await searchParams;

  if (isDemoActiveTag(uuid)) {
    redirect(`/v/${uuid}`);
  }

  const documentLoad: TagLoadOptions = {
    documents: {
      mode: "types",
      types: ["invoice"],
      columns: "showcase",
    },
  };

  const sessionUser = await getCurrentUser();
  const misroute = await resolveVehicleIdScanMisroute(
    uuid,
    sessionUser?.id ?? null,
  );
  if (misroute.kind === "owner_garage") {
    redirect(garagePathForVehicle(misroute.vehicleId, "entdecken"));
  }

  const preload = await getTagByUuid(uuid, documentLoad);
  if (preload?.vehicle && preload.tag.status !== "active") {
    const access = await getTagVehicleAccess(
      preload.tag.uuid,
      preload.vehicle.user_id,
      preload.vehicle.id,
    );
    if (access.isOwner) {
      redirect(garagePathForVehicle(preload.vehicle.id, "entdecken"));
    }
  }

  const { result } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/entdecken`,
    load: documentLoad,
  });
  const vehicle = result.vehicle!;
  const scope = { vehicleId: vehicle.id, linkedTagUuid: uuid };

  let weeklyRankCelebration = null;
  if (sessionUser) {
    try {
      weeklyRankCelebration = await loadPendingWeeklyRankAwardForVehicle(
        sessionUser.id,
        vehicle.id,
      );
    } catch (error) {
      console.error("[entdecken] weekly award preload failed", error);
    }
  }

  const { isConfigured } = getSupabaseEnv();
  let initialCards: Awaited<ReturnType<typeof loadShowcaseSwipeDeck>> = [];
  let initialWeeklyBuilds: Awaited<ReturnType<typeof loadWeeklyTopBuilds>> = [];
  let ownWeeklyRank: Awaited<
    ReturnType<typeof loadVehicleWeeklyShowcaseRank>
  > = null;
  let dailySwipeStats: Awaited<
    ReturnType<typeof loadVehicleShowcaseSwipeDailyStats>
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
    try {
      dailySwipeStats = await loadVehicleShowcaseSwipeDailyStats(vehicle.id);
    } catch (error) {
      console.error("[entdecken] daily swipe stats preload failed", error);
    }
  }

  return (
    <AppShell showNavbar={false} immersiveNativeNav>
      <div className={discoverPageRootClassName}>
      <VehicleSettingsSubpageShell
        tagUuid={uuid}
        title="Builds entdecken"
        backHref={`/v/${uuid}`}
        backLabel="Dashboard"
        theme="discover"
      >
        <ShowcaseDiscoverExperience
          tagUuid={uuid}
          vehicleId={vehicle.id}
          entdeckenReturnHref={`/v/${uuid}/entdecken`}
          initialCards={initialCards}
          initialWeeklyBuilds={initialWeeklyBuilds}
          isPublic={Boolean(vehicle.is_public)}
          showcaseSwipeOptIn={Boolean(vehicle.showcase_swipe_opt_in)}
          ownWeeklyRank={ownWeeklyRank}
          dailySwipeStats={dailySwipeStats}
          ownTopThreeShareCardData={ownTopThreeShareCardData}
          weeklyRankCelebration={weeklyRankCelebration}
          openWeeklyAwardFromEmail={weeklyAward === "1"}
        />
        <LegalFooterNav tone="inverse" className="pt-2" />
      </VehicleSettingsSubpageShell>
      </div>
    </AppShell>
  );
}
