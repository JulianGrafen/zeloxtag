"use client";

import { useState } from "react";

import { ProPaywallModal } from "@/components/billing/pro-paywall-modal";
import { FEATURE } from "@/lib/permissions/feature-access";
import type { BuildPlannerPageData } from "@/lib/build-planner/types";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

import { BuildPlannerView } from "./build-planner-view";

type BuildPlannerClientProps = {
  vehicleSurfaceScope: VehicleSurfaceScope;
  vehicleId: string;
  tagUuid: string;
  vehicleModel: string;
  initialData: BuildPlannerPageData;
  aiUnlocked: boolean;
  readOnly?: boolean;
};

export function BuildPlannerClient({
  vehicleSurfaceScope,
  vehicleId,
  tagUuid,
  vehicleModel,
  initialData,
  aiUnlocked,
  readOnly = false,
}: BuildPlannerClientProps) {
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (readOnly) {
    return (
      <p className="p-6 text-center text-[color:var(--vd-muted)]">
        Build Planner ist im Showcase nicht verfügbar.
      </p>
    );
  }

  return (
    <>
      <BuildPlannerView
        vehicleSurfaceScope={vehicleSurfaceScope}
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        vehicleModel={vehicleModel}
        initialData={initialData}
        aiUnlocked={aiUnlocked}
        onAiLocked={() => setPaywallOpen(true)}
      />
      <ProPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature={FEATURE.USE_BUILD_PLANNER_AI}
        tagUuid={tagUuid}
      />
    </>
  );
}
