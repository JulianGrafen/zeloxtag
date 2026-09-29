import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ShowcaseSwipeDeck } from "@/components/showcase-swipe/ShowcaseSwipeDeck";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { getCurrentUser } from "@/lib/auth/get-user";
import { loginGateHref } from "@/lib/auth/login-gate-url";
import { loadShowcaseSwipeDeck } from "@/lib/showcase/swipe-deck";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getSupabaseEnv } from "@/lib/supabase/env";

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
  if (isConfigured) {
    try {
      initialCards = await loadShowcaseSwipeDeck(15);
    } catch (error) {
      console.error("[entdecken] deck preload failed", error);
    }
  }

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={scope.linkedTagUuid ?? vehicleId}
        title="Builds entdecken"
        description="Nur öffentliche Showcase-Daten — keine Belege oder VIN. Rechts liken, links passen."
        backHref={`${vehicleSurfaceHref(scope)}`}
        backLabel="Dashboard"
      >
        <ShowcaseSwipeDeck tagUuid={scope.linkedTagUuid ?? vehicleId} initialCards={initialCards} />
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
