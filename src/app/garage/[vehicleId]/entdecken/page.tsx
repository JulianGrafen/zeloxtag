import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { ShowcaseDiscoverIntro } from "@/components/showcase-swipe/showcase-discover-intro";
import { ShowcaseDiscoverExperience } from "@/components/showcase-swipe/showcase-discover-experience";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { loginGateHref } from "@/lib/auth/login-gate-url";
import {
  loadOwnerVehicleSwipeLikeCounts,
  loadShowcaseSwipeDeck,
} from "@/lib/showcase/swipe-deck";
import { loadWeeklyTopBuilds } from "@/lib/showcase/weekly-top-builds";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { scopeFromGarageRoute } from "@/lib/vehicle-surface/paths";

interface EntdeckenPageProps {
  params: Promise<{ vehicleId: string }>;
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
  const { vehicleId } = await params;
  const garageNavScope = scopeFromGarageRoute(vehicleId);
  const { scope } = await requireVehicleSurfaceOwner({ vehicleId });

  if (isDemoActiveTag(scope.linkedTagUuid ?? "")) {
    redirect(`${vehicleSurfaceHref(scope)}`);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(loginGateHref(vehicleSurfaceHref(scope, "entdecken")));
  }

  const { isConfigured } = getSupabaseEnv();
  let initialCards: Awaited<ReturnType<typeof loadShowcaseSwipeDeck>> = [];
  let initialWeeklyBuilds: Awaited<ReturnType<typeof loadWeeklyTopBuilds>> = [];
  let ownSwipeTotalLikes = 0;
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
      const counts = await loadOwnerVehicleSwipeLikeCounts(vehicleId);
      ownSwipeTotalLikes = counts.totalLikes;
    } catch (error) {
      console.error("[entdecken] own swipe likes preload failed", error);
    }
  }

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        vehicleSurfaceScope={garageNavScope}
        title="Builds entdecken"
        description={
          <ShowcaseDiscoverIntro
            profilSettingsHref={vehicleSurfaceHref(scope, "einstellungen/profil")}
          />
        }
        backHref={`${vehicleSurfaceHref(scope)}`}
        backLabel="Dashboard"
      >
        <ShowcaseDiscoverExperience
          tagUuid={scope.linkedTagUuid ?? vehicleId}
          initialCards={initialCards}
          initialWeeklyBuilds={initialWeeklyBuilds}
          ownSwipeTotalLikes={ownSwipeTotalLikes}
        />
        <LegalFooterNav className="pt-2" />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
