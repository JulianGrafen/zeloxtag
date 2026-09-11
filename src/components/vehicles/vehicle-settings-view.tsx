"use client";

import { VehicleExposeSubmenu } from "@/components/vehicles/vehicle-expose-submenu";
import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { VehicleShowcaseSettings } from "@/components/vehicles/vehicle-showcase-settings";
import type { Document, Vehicle } from "@/types/database";

type VehicleSettingsViewProps = {
  tagUuid: string;
  vehicle: Vehicle;
  documents: Document[];
  galleryPhotos: Document[];
  canEdit: boolean;
  isExposeActive: boolean;
};

export function VehicleSettingsView({
  tagUuid,
  vehicle,
  documents,
  galleryPhotos,
  canEdit,
  isExposeActive,
}: VehicleSettingsViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <VehicleShowcaseSettings
        tagUuid={tagUuid}
        vehicle={vehicle}
        documents={documents}
        galleryPhotos={galleryPhotos}
        canEdit={canEdit}
      />

      <VehicleExposeSubmenu
        tagUuid={tagUuid}
        isExposeActive={isExposeActive}
      />

      <VehicleSettingsSubmenuLink
        href="/settings"
        tour="konto-security-link"
        title="Konto & Sicherheit"
        subtitle="2FA, Sitzung und Abmelden"
      />
    </div>
  );
}
