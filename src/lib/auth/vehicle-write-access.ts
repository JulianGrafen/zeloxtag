import { createClient } from "@/lib/supabase/server";

export type VehicleWriteAccess = {
  ok: boolean;
  isOwner: boolean;
  isContributor: boolean;
  /** Always the vehicle owner — used for documents.user_id. */
  ownerUserId: string | null;
  vehicleId: string | null;
};

const CONTRIBUTOR_INVOICE_TYPES = new Set(["invoice"]);

/**
 * Whether the session user may write documents for this vehicle.
 * Uses the user-scoped client + RLS (no service-role bypass).
 * Owners: full write. Active Schrauber: invoice rows only (enforced by callers).
 */
export async function getVehicleWriteAccess(
  vehicleId: string,
  userId: string,
): Promise<VehicleWriteAccess> {
  const denied: VehicleWriteAccess = {
    ok: false,
    isOwner: false,
    isContributor: false,
    ownerUserId: null,
    vehicleId: null,
  };

  if (!vehicleId || !userId) {
    return denied;
  }

  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, user_id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (!vehicle?.id || !vehicle.user_id) {
    return denied;
  }

  if (vehicle.user_id === userId) {
    return {
      ok: true,
      isOwner: true,
      isContributor: false,
      ownerUserId: vehicle.user_id,
      vehicleId: vehicle.id,
    };
  }

  const { data: grant } = await supabase
    .from("vehicle_contributors")
    .select("id")
    .eq("vehicle_id", vehicle.id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!grant) {
    return {
      ...denied,
      ownerUserId: vehicle.user_id,
      vehicleId: vehicle.id,
    };
  }

  return {
    ok: true,
    isOwner: false,
    isContributor: true,
    ownerUserId: vehicle.user_id,
    vehicleId: vehicle.id,
  };
}

/** Contributors may only persist invoice-type documents. */
export function contributorMayWriteDocumentType(
  isContributor: boolean,
  isOwner: boolean,
  documentType: string,
): boolean {
  if (isOwner) return true;
  if (!isContributor) return false;
  return CONTRIBUTOR_INVOICE_TYPES.has(documentType);
}
