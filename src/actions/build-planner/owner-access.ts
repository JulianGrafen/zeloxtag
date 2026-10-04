"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getVehicleWriteAccess } from "@/lib/auth/vehicle-write-access";
import { revalidateManualEntryPaths } from "@/lib/documents/manual-entry-paths";

export type BuildPlannerOwnerContext =
  | { ok: true; userId: string; ownerUserId: string }
  | { ok: false; message: string };

export async function resolveBuildPlannerOwner(
  vehicleId: string,
): Promise<BuildPlannerOwnerContext> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Bitte anmelden." };
  }

  const access = await getVehicleWriteAccess(vehicleId, user.id);
  if (!access.ok || !access.isOwner || !access.ownerUserId) {
    return {
      ok: false,
      message: "Nur der Fahrzeughalter kann den Build Planner nutzen.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    ownerUserId: access.ownerUserId,
  };
}

export async function revalidateBuildPlannerPaths(
  vehicleId: string,
  tagUuid?: string,
  documentId?: string,
): Promise<void> {
  await revalidateManualEntryPaths(vehicleId, tagUuid, documentId);
}
