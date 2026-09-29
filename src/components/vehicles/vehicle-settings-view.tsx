"use client";

import { VehicleExposeSubmenu } from "@/components/vehicles/vehicle-expose-submenu";
import { VehicleSettingsSubmenuLink } from "@/components/vehicles/vehicle-settings-submenu-link";
import { VehicleShowcaseSettings } from "@/components/vehicles/vehicle-showcase-settings";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { Document, Vehicle } from "@/types/database";

type VehicleSettingsViewProps = {
  surfaceScope: VehicleSurfaceScope;
  vehicle: Vehicle;
  documents: Document[];
  galleryPhotos: Document[];
  canEdit: boolean;
  isExposeActive: boolean;
  hasLinkedTag: boolean;
};

export function VehicleSettingsView({
  surfaceScope,
  vehicle,
  documents,
  galleryPhotos,
  canEdit,
  isExposeActive,
  hasLinkedTag,
}: VehicleSettingsViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <VehicleShowcaseSettings
        surfaceScope={surfaceScope}
        vehicle={vehicle}
        documents={documents}
        galleryPhotos={galleryPhotos}
        canEdit={canEdit}
        hasLinkedTag={hasLinkedTag}
      />

      <VehicleExposeSubmenu
        surfaceScope={surfaceScope}
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
