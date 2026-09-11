"use client";

import { useRouter } from "next/navigation";

import { VehicleSilhouetteUpload } from "@/components/onboarding/VehicleSilhouetteUpload";
import type { SilhouetteUploadResult } from "@/components/onboarding/VehicleSilhouetteUpload";
import {
  cacheBustFromSilhouetteUrl,
  silhouetteDisplayUrl,
} from "@/lib/vehicles/silhouette-display-url";
import {
  clearSilhouetteFromSession,
  readSilhouetteVersionFromSession,
  writeSilhouetteToSession,
} from "@/lib/vehicles/silhouette-session";
import type { Vehicle } from "@/types/database";

type VehicleFahrzeugbildSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  canEdit: boolean;
};

export function VehicleFahrzeugbildSettings({
  tagUuid,
  vehicle,
  canEdit,
}: VehicleFahrzeugbildSettingsProps) {
  const router = useRouter();
  const profilePhotoUrl = vehicle.silhouette_image_url?.trim()
    ? silhouetteDisplayUrl(
        vehicle.id,
        vehicle.updated_at ??
          readSilhouetteVersionFromSession(vehicle.id) ??
          undefined,
      )
    : null;

  if (!canEdit) {
    if (!profilePhotoUrl) {
      return (
        <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
          Kein Fahrzeugbild hinterlegt.
        </p>
      );
    }
    return (
      <div className="relative mx-auto aspect-[4/3] w-full max-w-[16rem] overflow-hidden rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profilePhotoUrl}
          alt="Fahrzeugbild"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <VehicleSilhouetteUpload
      vehicleId={vehicle.id}
      tagUuid={tagUuid}
      initialDisplayUrl={profilePhotoUrl}
      allowDelete
      layout="plain"
      hideHeader
      onUploaded={(result: SilhouetteUploadResult) => {
        const bust =
          cacheBustFromSilhouetteUrl(result.displayUrl) ?? Date.now().toString();
        writeSilhouetteToSession(vehicle.id, result.storageUrl, bust);
        router.refresh();
      }}
      onDeleted={() => {
        clearSilhouetteFromSession(vehicle.id);
        router.refresh();
      }}
    />
  );
}
