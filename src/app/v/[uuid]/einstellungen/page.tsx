import type { Metadata } from "next";

import { IOSListPage } from "@/components/ui/ios";
import { VehicleSettingsView } from "@/components/vehicles/vehicle-settings-view";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { loadShowcaseGalleryDocuments } from "@/lib/documents/load-showcase-gallery";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { loadVehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank";
import { getOwnerExposeState } from "@/lib/vehicles/get-public-expose";
import { getSupabaseEnv } from "@/lib/supabase/env";

interface VehicleSettingsPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Showcase · ZeloxTag",
    description: "Öffentlicher Showcase und Verkaufs-Exposé verwalten.",
  };
}

export default async function VehicleSettingsPage({
  params,
}: VehicleSettingsPageProps) {
  const { uuid } = await params;
  const { result, isDemoShowcase } = await requireTagOwner(uuid, {
    loginNext: `/v/${uuid}/einstellungen`,
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "showcase",
      },
    },
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(uuid);
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
    <IOSListPage title="Einstellungen" backHref={`/v/${uuid}`}>
      <VehicleSettingsView
        surfaceScope={{ vehicleId: vehicle.id, linkedTagUuid: uuid }}
        vehicle={vehicle}
        documents={result.documents}
        galleryPhotos={galleryPhotos}
        canEdit={!isDemo}
        isExposeActive={expose.isExposeActive}
        hasLinkedTag
        weeklyRank={weeklyRank}
      />
    </IOSListPage>
  );
}
