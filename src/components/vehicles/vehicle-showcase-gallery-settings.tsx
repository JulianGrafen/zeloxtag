"use client";

import { useRouter } from "next/navigation";

import { ShowcaseGallerySettings } from "@/components/vehicles/showcase-gallery-settings";
import type { Document } from "@/types/database";

type VehicleShowcaseGallerySettingsProps = {
  tagUuid: string;
  vehicleId: string;
  photos: Document[];
  canEdit: boolean;
};

export function VehicleShowcaseGallerySettings({
  tagUuid,
  vehicleId,
  photos,
  canEdit,
}: VehicleShowcaseGallerySettingsProps) {
  const router = useRouter();

  return (
    <section className="zt-feature-panel p-4 sm:p-5">
      <ShowcaseGallerySettings
        embedded
        tagUuid={tagUuid}
        vehicleId={vehicleId}
        photos={photos}
        canEdit={canEdit}
        onChanged={() => router.refresh()}
      />
    </section>
  );
}
