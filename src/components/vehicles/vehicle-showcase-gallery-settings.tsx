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
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 sm:p-5">
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
