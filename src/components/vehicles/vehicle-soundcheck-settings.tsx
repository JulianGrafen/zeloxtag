"use client";

import { useRouter } from "next/navigation";

import { VehicleEngineSoundUpload } from "@/components/vehicles/vehicle-engine-sound-upload";

type VehicleSoundcheckSettingsProps = {
  vehicleId: string;
  tagUuid: string;
  soundUrl: string | null;
  canEdit: boolean;
};

export function VehicleSoundcheckSettings({
  vehicleId,
  tagUuid,
  soundUrl,
  canEdit,
}: VehicleSoundcheckSettingsProps) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <VehicleEngineSoundUpload
      embedded
      vehicleId={vehicleId}
      tagUuid={tagUuid}
      soundUrl={soundUrl}
      canEdit={canEdit}
      allowDelete={canEdit}
      onUploaded={refresh}
      onDeleted={refresh}
    />
  );
}
