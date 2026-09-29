import { z } from "zod";

import { completeGarageVehicleForOwner } from "@/lib/hardware/complete-garage-vehicle-for-owner";
import {
  clearPendingGarageVehicle,
  getPendingGarageVehicle,
} from "@/lib/hardware/pending-garage-vehicle";

const ownerUserIdSchema = z.string().uuid();

export async function completePendingGarageVehicleForUser(
  ownerUserId: string,
): Promise<
  | { status: "created"; vehicleId: string }
  | { status: "error"; message: string }
  | null
> {
  const parsed = ownerUserIdSchema.safeParse(ownerUserId);
  if (!parsed.success) {
    return { status: "error", message: "Ungültige Sitzung." };
  }

  const pending = await getPendingGarageVehicle();
  if (!pending) return null;

  const result = await completeGarageVehicleForOwner(parsed.data, pending);
  await clearPendingGarageVehicle();
  return result;
}
