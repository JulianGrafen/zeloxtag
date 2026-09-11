"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { VehicleExposeSubmenu } from "@/components/vehicles/vehicle-expose-submenu";
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
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim() || "Fahrzeug";

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
        vehicleLabel={vehicleLabel}
      />

      <Link
        href="/settings"
        data-tour="konto-security-link"
        className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
      >
        <span>
          <span className="block text-[0.88rem] font-medium">Konto & Sicherheit</span>
          <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
            2FA, Sitzung und Abmelden
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]" aria-hidden />
      </Link>
    </div>
  );
}
