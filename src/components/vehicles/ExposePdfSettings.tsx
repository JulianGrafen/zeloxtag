"use client";

import { useState } from "react";

import { ProPaywallModal } from "@/components/billing/pro-paywall-modal";
import { GenerateExposeButton } from "@/components/vehicles/GenerateExposeButton";
import { FEATURE } from "@/lib/permissions/feature-access";
import type { Vehicle } from "@/types/database";

type ExposePdfSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  canEdit: boolean;
  canUseExpose?: boolean;
};

export function ExposePdfSettings({
  tagUuid,
  vehicle,
  canEdit,
  canUseExpose = true,
}: ExposePdfSettingsProps) {
  const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();
  const [paywallOpen, setPaywallOpen] = useState(false);

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <GenerateExposeButton
        vehicleId={vehicle.id}
        vehicleLabel={vehicleLabel}
        disabled={!canEdit}
        onProRequired={
          canUseExpose ? undefined : () => setPaywallOpen(true)
        }
      />
      <ProPaywallModal
        open={paywallOpen}
        feature={FEATURE.GENERATE_EXPOSE}
        tagUuid={tagUuid}
        onClose={() => setPaywallOpen(false)}
      />
    </section>
  );
}
