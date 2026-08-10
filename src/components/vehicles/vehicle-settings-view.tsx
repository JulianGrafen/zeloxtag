"use client";

import Link from "next/link";
import { ChevronRight, FileDown } from "lucide-react";

import { GenerateExposeButton } from "@/components/vehicles/GenerateExposeButton";
import { VehicleShowcaseSettings } from "@/components/vehicles/vehicle-showcase-settings";
import type { Document, Vehicle } from "@/types/database";

type VehicleSettingsViewProps = {
  tagUuid: string;
  vehicle: Vehicle;
  documents: Document[];
  canEdit: boolean;
};

export function VehicleSettingsView({
  tagUuid,
  vehicle,
  documents,
  canEdit,
}: VehicleSettingsViewProps) {
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();

  return (
    <div className="flex flex-col gap-5">
      <VehicleShowcaseSettings
        tagUuid={tagUuid}
        vehicle={vehicle}
        documents={documents}
        canEdit={canEdit}
      />

      <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileDown className="h-4 w-4 text-[color:var(--vd-accent)]" aria-hidden />
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Verkaufs-Exposé
          </h2>
        </div>
        <p className="mb-4 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
          Druckfertiges PDF mit Fahrzeugdaten, Servicehistorie, Umbauten und
          QR-Link zum ZeloxTag-Profil — ideal für Inserate und Käufergespräche.
        </p>
        <GenerateExposeButton
          vehicleId={vehicle.id}
          vehicleLabel={vehicleLabel}
          disabled={!canEdit}
        />
      </section>

      <Link
        href="/settings"
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
