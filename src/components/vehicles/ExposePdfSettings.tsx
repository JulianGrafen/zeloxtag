"use client";

import { useState } from "react";

import { ProPaywallModal } from "@/components/billing/pro-paywall-modal";
import { formatPaywallVehicleLabel } from "@/lib/billing/paywall-personalization";
import { resolveVehicleHeroDisplay } from "@/lib/vehicles/resolve-vehicle-hero-display";
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
  const paywallHero = resolveVehicleHeroDisplay({
    vehicle,
    tagUuid,
  });

  return (
    <section className="zt-feature-panel p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <GenerateExposeButton
        vehicleId={vehicle.id}
        vehicleLabel={vehicleLabel}
        disabled={!canEdit}
        profileHidesFinancials={vehicle.hide_financials !== false}
        onProRequired={
          canUseExpose ? undefined : () => setPaywallOpen(true)
        }
      />
      <ProPaywallModal
        open={paywallOpen}
        feature={FEATURE.GENERATE_EXPOSE}
        tagUuid={tagUuid}
        triggerContext={{
          vehicleLabel: formatPaywallVehicleLabel(
            vehicle.make,
            vehicle.model,
            vehicle.year,
          ),
          vehicleImage: paywallHero.vehicleImage,
          vehicleImageFallback: paywallHero.vehicleImageFallback,
          vehicleImagePreviewFallback: paywallHero.vehicleImagePreviewFallback,
          vehicleImageFrameless: paywallHero.vehicleImageFrameless,
          vehicleImageAlt: paywallHero.vehicleImageAlt,
        }}
        vehicleHero={paywallHero}
        onClose={() => setPaywallOpen(false)}
      />
    </section>
  );
}
