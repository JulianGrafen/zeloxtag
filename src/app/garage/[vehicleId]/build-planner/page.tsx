import type { Metadata } from "next";

import { BuildPlannerClient } from "@/components/build-planner/build-planner-client";
import { loadBuildPlannerPageData } from "@/lib/build-planner/load-build-planner-page";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { scopeFromGarageRoute } from "@/lib/vehicle-surface/paths";

interface BuildPlannerPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Build Planner · ZeloxTag",
    description: "Geplante Mods, Budget und Auto-To-Dos für deinen Build.",
  };
}

export default async function GarageBuildPlannerPage({
  params,
}: BuildPlannerPageProps) {
  const { vehicleId } = await params;
  const garageNavScope = scopeFromGarageRoute(vehicleId);
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner(
    { vehicleId },
    {
      loginNext: `/garage/${vehicleId}/build-planner`,
      load: {
        documents: {
          mode: "types",
          types: ["invoice"],
          columns: "invoice",
        },
      },
    },
  );

  const vehicle = result.vehicle!;
  const pageData = await loadBuildPlannerPageData(
    vehicle.id,
    isDemoShowcase ? [] : result.documents,
  );

  const membershipActive = await userHasActiveMembership(vehicle.user_id);
  const vehicleModel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <BuildPlannerClient
      vehicleSurfaceScope={garageNavScope}
      vehicleId={vehicle.id}
      tagUuid={scope.linkedTagUuid ?? vehicleId}
      vehicleModel={vehicleModel}
      initialData={pageData}
      aiUnlocked={membershipActive && !isDemoShowcase}
      readOnly={isDemoShowcase}
    />
  );
}
