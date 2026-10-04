import type { Metadata } from "next";

import { BuildPlannerClient } from "@/components/build-planner/build-planner-client";
import { loadBuildPlannerPageData } from "@/lib/build-planner/load-build-planner-page";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";

interface TagBuildPlannerPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Build Planner · ZeloxTag",
    description: "Geplante Mods, Budget und Auto-To-Dos für deinen Build.",
  };
}

export default async function TagBuildPlannerPage({
  params,
}: TagBuildPlannerPageProps) {
  const { uuid } = await params;
  const demoShowcase = isDemoActiveTag(uuid);
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner(
    { tagUuid: uuid },
    {
      loginNext: `/v/${uuid}/build-planner`,
      pathSegment: "build-planner",
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
  const pageData =
    isDemoShowcase || demoShowcase
      ? {
          mods: [],
          summary: (
            await loadBuildPlannerPageData(vehicle.id, [])
          ).summary,
        }
      : await loadBuildPlannerPageData(vehicle.id, result.documents);

  const membershipActive = await userHasActiveMembership(vehicle.user_id);
  const vehicleModel = `${vehicle.make} ${vehicle.model} · ${vehicle.year}`;

  return (
    <BuildPlannerClient
      vehicleSurfaceScope={scope}
      vehicleId={vehicle.id}
      tagUuid={uuid}
      vehicleModel={vehicleModel}
      initialData={pageData}
      aiUnlocked={membershipActive && !isDemoShowcase && !demoShowcase}
      readOnly={isDemoShowcase || demoShowcase}
    />
  );
}
