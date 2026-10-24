import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { IOSGroupedList } from "@/components/ui/ios";
import { VehicleShowcaseStoryPassSettings } from "@/components/vehicles/vehicle-showcase-story-pass-settings";
import { VehicleSettingsSubpageShell } from "@/components/vehicles/vehicle-settings-subpage-shell";
import { loadVehicleStoryPassSettingsPage } from "@/lib/vehicles/load-vehicle-story-pass-settings-page";
import { loadVehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank";
import { getSupabaseEnv } from "@/lib/supabase/env";

interface StoryPassSettingsPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Story-Pass · ZeloxTag",
    description: "Story- und Post-Grafiken für Instagram und Social teilen.",
  };
}

export default async function VehicleStoryPassSettingsPage({
  params,
}: StoryPassSettingsPageProps) {
  const { vehicleId } = await params;
  const { vehicle, documents, scope } =
    await loadVehicleStoryPassSettingsPage(vehicleId);
  const tagUuid = scope.linkedTagUuid ?? vehicleId;
  const { isConfigured } = getSupabaseEnv();
  let weeklyRank: Awaited<
    ReturnType<typeof loadVehicleWeeklyShowcaseRank>
  > = null;

  if (isConfigured) {
    try {
      weeklyRank = await loadVehicleWeeklyShowcaseRank(vehicle.id);
    } catch (error) {
      console.error("[story-pass-settings] weekly rank preload failed", error);
    }
  }

  return (
    <AppShell showNavbar={false}>
      <VehicleSettingsSubpageShell
        tagUuid={tagUuid}
        vehicleSurfaceScope={scope}
        title="Story-Pass"
        description="Format und Stil wählen — Story oder Post, optional mit Wochenplatzierung."
        theme="discover"
      >
        <IOSGroupedList>
          <VehicleShowcaseStoryPassSettings
            vehicle={vehicle}
            documents={documents}
            weeklyRank={weeklyRank}
            embeddedInGroup
          />
        </IOSGroupedList>
      </VehicleSettingsSubpageShell>
    </AppShell>
  );
}
