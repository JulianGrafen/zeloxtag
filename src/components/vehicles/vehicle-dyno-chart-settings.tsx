"use client";

import { useRouter } from "next/navigation";

import { VehicleDynoChartUpload } from "@/components/vehicles/vehicle-dyno-chart-upload";

type VehicleDynoChartSettingsProps = {
  vehicleId: string;
  tagUuid: string;
  dynoChartUrl: string | null;
  canEdit: boolean;
};

export function VehicleDynoChartSettings({
  vehicleId,
  tagUuid,
  dynoChartUrl,
  canEdit,
}: VehicleDynoChartSettingsProps) {
  const router = useRouter();

  return (
    <section className="zt-feature-panel p-4 sm:p-5">
      <VehicleDynoChartUpload
        embedded
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        dynoChartUrl={dynoChartUrl}
        canEdit={canEdit}
        allowDelete={canEdit}
        onUploaded={() => router.refresh()}
        onDeleted={() => router.refresh()}
      />
    </section>
  );
}
