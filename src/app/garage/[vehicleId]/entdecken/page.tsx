import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { discoverPageRootClassName } from "@/components/showcase-swipe/discover-minimal/discover-surface-styles";
import { ShowcaseDiscoverExperience } from "@/components/showcase-swipe/showcase-discover-experience";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { loginGateHref } from "@/lib/auth/login-gate-url";
import { loadShowcaseSwipeDeck } from "@/lib/showcase/swipe-deck";
import { buildOwnerShareableBuildData } from "@/lib/showcase/build-owner-shareable-build-data";
import { loadVehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats";
import { loadVehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank";
import { topThreeWeeklyRankOrNull } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { loadPendingWeeklyRankAwardForVehicle } from "@/lib/showcase/load-weekly-rank-award";
import { loadWeeklyTopBuilds } from "@/lib/showcase/weekly-top-builds";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { scopeFromGarageRoute } from "@/lib/vehicle-surface/paths";

interface EntdeckenPageProps {
  params: Promise<{ vehicleId: string }>;
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
  const { vehicleId } = await params;
  const { weeklyAward } = await searchParams;
  const garageNavScope = scopeFromGarageRoute(vehicleId);
  const { scope, result } = await requireVehicleSurfaceOwner({ vehicleId }, {
    pathSegment: "entdecken",
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "showcase",
      },
    },
  });
  const vehicle = result.vehicle!;

  if (isDemoActiveTag(scope.linkedTagUuid ?? "")) {
    redirect(`${vehicleSurfaceHref(scope)}`);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(loginGateHref(vehicleSurfaceHref(scope, "entdecken")));
  }

  let weeklyRankCelebration = null;
  try {
    weeklyRankCelebration = await loadPendingWeeklyRankAwardForVehicle(
      user.id,
      vehicle.id,
    );
  } catch (error) {
    console.error("[entdecken] weekly award preload failed", error);
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
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleSurfaceScope={garageNavScope}
        title="Builds entdecken"
        backHref={`${vehicleSurfaceHref(scope)}`}
        backLabel="Dashboard"
        theme="discover"
      >
        <ShowcaseDiscoverExperience
          tagUuid={scope.linkedTagUuid ?? vehicleId}
          vehicleId={vehicle.id}
          entdeckenReturnHref={vehicleSurfaceHref(scope, "entdecken")}
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
