import { createClient } from "@/lib/supabase/server";

export type VehicleWriteAccess = {
  ok: boolean;
  isOwner: boolean;
  isContributor: boolean;
  /** Always the vehicle owner — used for documents.user_id. */
  ownerUserId: string | null;
  vehicleId: string | null;
  /** Set when ok is false. */
  message?: string;
};

const CONTRIBUTOR_INVOICE_TYPES = new Set(["invoice"]);

function denied(partial?: Partial<VehicleWriteAccess>): VehicleWriteAccess {
  return {
    ok: false,
    isOwner: false,
    isContributor: false,
    ownerUserId: null,
    vehicleId: null,
    ...partial,
  };
}

export function writeAccessErrorMessage(access: VehicleWriteAccess): string {
  return access.message?.trim() || "Kein Schreibzugriff auf dieses Fahrzeug.";
}

/**
 * Whether the session user may write documents for this vehicle.
 * Identity + role only — Pro features are gated via `assertOwnerFeature`.
 */
export async function getVehicleWriteAccess(
  vehicleId: string,
  userId: string,
): Promise<VehicleWriteAccess> {
  if (!vehicleId || !userId) {
    return denied();
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("[vehicle-write-access] createClient failed", error);
    return denied({ message: "Datenbankverbindung fehlgeschlagen." });
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, user_id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (!vehicle?.id || !vehicle.user_id) {
    return denied();
  }

  const asOwner = vehicle.user_id === userId;
  let asContributor = false;

  if (!asOwner) {
    const { data: grant } = await supabase
      .from("vehicle_contributors")
      .select("id")
      .eq("vehicle_id", vehicle.id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    asContributor = Boolean(grant);
  }

  if (!asOwner && !asContributor) {
    return denied({
      ownerUserId: vehicle.user_id,
      vehicleId: vehicle.id,
    });
  }

  return {
    ok: true,
    isOwner: asOwner,
    isContributor: asContributor,
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
