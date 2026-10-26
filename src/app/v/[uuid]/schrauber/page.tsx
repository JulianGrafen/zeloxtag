import type { Metadata } from "next";

import { SchrauberManagePanel } from "@/components/contributors/schrauber-manage-panel";
import { wrapProFeature } from "@/components/billing/pro-feature-gate";
import { IOSListPage } from "@/components/ui/ios";
import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";

interface SchrauberPageProps {
  params: Promise<{ uuid: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Schrauber · ZeloxTag",
    description: "Werkstatt-Zugang für Reparatur-Einträge verwalten.",
  };
}

export default async function SchrauberPage({ params }: SchrauberPageProps) {
  const { uuid } = await params;
  const { result, isDemoShowcase } = await requireTagOwner(uuid);
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(uuid);
  const vehicleSubtitle = [`${vehicle.make} ${vehicle.model}`, vehicle.year]
    .filter(Boolean)
    .join(" · ");

  return wrapProFeature({
    isDemo,
    ownerUserId: vehicle.user_id,
    tagUuid: uuid,
    feature: FEATURE.INVITE_SCHRAUBER,
    children: (
      <IOSListPage
        title="Werkstatt"
        subtitle={vehicleSubtitle}
        backHref={`/v/${uuid}`}
      >
        <SchrauberManagePanel
          vehicleId={vehicle.id}
          tagUuid={uuid}
          readOnly={isDemo}
        />
      </IOSListPage>
    ),
  });
}
