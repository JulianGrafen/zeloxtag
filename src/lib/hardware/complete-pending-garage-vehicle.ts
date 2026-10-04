import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { completeGarageVehicleForOwner } from "@/lib/hardware/complete-garage-vehicle-for-owner";
import {
  clearPendingGarageVehicleState,
  resolvePendingGarageVehicle,
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

  const pending = await resolvePendingGarageVehicle(parsed.data);
  if (!pending) return null;

  const user = await getCurrentUser();
  if (
    user &&
    pending.email.trim().toLowerCase() !== user.email?.trim().toLowerCase()
  ) {
    return {
      status: "error",
      message: "Gespeicherte Fahrzeugdaten passen nicht zu diesem Konto.",
    };
  }

  const result = await completeGarageVehicleForOwner(parsed.data, pending);
  if (result.status === "created") {
    await clearPendingGarageVehicleState(parsed.data);
  }
  return result;
}
