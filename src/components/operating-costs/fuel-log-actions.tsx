"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FuelScanProUpgradeModal } from "@/components/operating-costs/fuel-scan-pro-upgrade-modal";
import { FuelScanCta } from "@/components/operating-costs/fuel-scan-cta";
import { useUserTier } from "@/hooks/use-user-tier";
import type { FuelScanTierSnapshot } from "@/lib/billing/subscription-types";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

type FuelLogActionsProps = {
  tagUuid: string;
  fuelScanTier: FuelScanTierSnapshot;
};

export function FuelLogActions({ tagUuid, fuelScanTier }: FuelLogActionsProps) {
  const router = useRouter();
  const tier = useUserTier({ initial: fuelScanTier });
  const [paywallOpen, setPaywallOpen] = useState(false);

  function openPaywall() {
    setPaywallOpen(true);
  }

  function handleScan() {
    if (!tier.canScan) {
      openPaywall();
      return;
    }
    router.push(`/v/${tagUuid}/tanken/erfassen`);
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <FuelScanCta
          isPro={tier.isPro}
          remainingFreeScans={tier.remainingFreeScans}
          totalFreeScans={tier.totalFreeScans}
          canScan={tier.canScan}
          onScan={handleScan}
        />
        <PressableLink
          href={`/v/${tagUuid}/tanken/manuell`}
          className="flex w-full items-center justify-center gap-2 zt-feature-panel px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)]"
        >
          Manuell eintragen
        </PressableLink>
      </div>

      <FuelScanProUpgradeModal
        open={paywallOpen}
        tagUuid={tagUuid}
        onClose={() => setPaywallOpen(false)}
        onManualEntry={() => {
          router.push(`/v/${tagUuid}/tanken/manuell`);
        }}
      />
    </>
  );
}
