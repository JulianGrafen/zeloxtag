import { vehicleSurfaceHref } from "@/lib/vehicle-surface/paths";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { IOSListPage } from "@/components/ui/ios";
import { VehicleSettingsView } from "@/components/vehicles/vehicle-settings-view";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { loadShowcaseGalleryDocuments } from "@/lib/documents/load-showcase-gallery";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { loadVehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank";
import { getOwnerExposeState } from "@/lib/vehicles/get-public-expose";
import { getSupabaseEnv } from "@/lib/supabase/env";

interface VehicleSettingsPageProps {
  params: Promise<{ vehicleId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Mein Fahrzeug · ZeloxTag",
    description: "Fahrzeugdaten, Showcase-Inhalte, Sichtbarkeit und Exposé verwalten.",
  };
}

export default async function VehicleSettingsPage({
  params,
}: VehicleSettingsPageProps) {
  const { vehicleId } = await params;
  const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner({ vehicleId }, {
    loginNext: `/garage/${vehicleId}/einstellungen`,
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "showcase",
      },
    },
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(scope.linkedTagUuid ?? "");
  const { isConfigured } = getSupabaseEnv();
  let weeklyRank: Awaited<
    ReturnType<typeof loadVehicleWeeklyShowcaseRank>
  > = null;

  const [expose, galleryPhotos] = await Promise.all([
    getOwnerExposeState(vehicle.id),
    loadShowcaseGalleryDocuments(vehicle.id),
  ]);

  if (isConfigured) {
    try {
      weeklyRank = await loadVehicleWeeklyShowcaseRank(vehicle.id);
    } catch (error) {
      console.error("[showcase-settings] weekly rank preload failed", error);
    }
  }

  return (
    <AppShell showNavbar={false}>
      <IOSListPage
        title="Mein Fahrzeug"
        backHref={vehicleSurfaceHref(scope)}
        backLabel="Dashboard"
      >
        <VehicleSettingsView
          surfaceScope={scope}
          vehicle={vehicle}
          documents={result.documents}
          galleryPhotos={galleryPhotos}
          canEdit={!isDemo}
          isExposeActive={expose.isExposeActive}
          hasLinkedTag={Boolean(scope.linkedTagUuid?.trim())}
          weeklyRank={weeklyRank}
        />
      </IOSListPage>
    </AppShell>
  );
}
