import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { VehicleSpecsView } from "@/components/vehicles/vehicle-specs-view";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTagVehicleAccess } from "@/lib/auth/vehicle-access";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

interface VehicleSpecsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata({
  params,
}: VehicleSpecsPageProps): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `Technische Daten · ${uuid}`,
    description: "Stammdaten und technische Fahrzeugdaten hinterlegen.",
  };
}

export default async function VehicleSpecsPage({
  params,
}: VehicleSpecsPageProps) {
  const { uuid } = await params;
  const result = await getTagByUuid(uuid);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/?next=${encodeURIComponent(`/v/${uuid}/daten`)}`);
  }

  const access = await getTagVehicleAccess(
    result.tag.uuid,
    result.vehicle.user_id,
  );

  const vehicle = {
    ...result.vehicle,
    tech_specs: parseVehicleTechSpecs(result.vehicle.tech_specs),
  };

  return (
    <VehicleSpecsView
      tagUuid={result.tag.uuid}
      vehicle={vehicle}
      canEdit={access.isOwner}
    />
  );
}
