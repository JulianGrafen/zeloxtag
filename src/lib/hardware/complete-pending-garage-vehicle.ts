import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { userHasGarageVehicle } from "@/lib/auth/user-has-vehicle";
import { completeGarageVehicleForOwner } from "@/lib/hardware/complete-garage-vehicle-for-owner";
import {
  clearPendingGarageVehicleState,
  resolvePendingGarageVehicle,
} from "@/lib/hardware/pending-garage-vehicle";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const ownerUserIdSchema = z.string().uuid();

async function oldestGarageVehicleId(userId: string): Promise<string | null> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}

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

  if (await userHasGarageVehicle(parsed.data)) {
    const existingId = await oldestGarageVehicleId(parsed.data);
    await clearPendingGarageVehicleState(parsed.data);
    if (existingId) {
      return { status: "created", vehicleId: existingId };
    }
    return null;
  }

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
