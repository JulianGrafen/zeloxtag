"use client";

import { useMemo } from "react";

import {
  ShareableSpecCard,
  buildShareableBuildData,
} from "@/components/shareable-spec-card";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Vehicle } from "@/types/database";

type VehicleShowcaseStoryPassSettingsProps = {
  vehicle: Vehicle;
  documents: Document[];
  linkedTagUuid: string | null;
};

export function VehicleShowcaseStoryPassSettings({
  vehicle,
  documents,
  linkedTagUuid,
}: VehicleShowcaseStoryPassSettingsProps) {
  const cardData = useMemo(() => {
    const payload = buildPublicShowcasePayload(vehicle, documents);
    return buildShareableBuildData({
      profile: payload.profile,
      modificationsCount: payload.modifications.length,
      tagUuid: linkedTagUuid ?? undefined,
      curbWeightKg: undefined,
    });
  }, [vehicle, documents, linkedTagUuid]);

  const specs = parseVehicleTechSpecs(vehicle.tech_specs);

  return (
    <div className="px-4 py-5">
      <div className="space-y-1">
        <h2 className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]">
          Story-Pass
        </h2>
        <p className="text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
          9:16-Karte für Instagram Stories — Balken wie im Showroom (Quartett-Segmente).
        </p>
      </div>

      {cardData ? (
        <ShareableSpecCard
          data={cardData}
          previewMaxWidth={280}
          className="mt-5 w-full"
        />
      ) : (
        <p className="mt-4 text-[0.82rem] text-[color:var(--vd-muted)]">
          {specs.powerPs == null || specs.torqueNm == null
            ? "Leistung (PS) und Drehmoment (Nm) unter Stammdaten / Technische Daten pflegen."
            : "Showcase-Daten konnten nicht geladen werden."}
        </p>
      )}
    </div>
  );
}
