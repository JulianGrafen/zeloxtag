import "server-only";

import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";

export async function loadVehicleUmbautenSettingsPage(tagUuid: string) {
  const { result, isDemoShowcase } = await requireTagOwner(tagUuid, {
    loginNext: `/v/${tagUuid}/einstellungen/umbauten`,
    load: {
      documents: {
        mode: "types",
        types: ["invoice"],
        columns: "showcase",
      },
    },
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(tagUuid);

  return {
    vehicle,
    documents: result.documents ?? [],
    isDemo,
  };
}
