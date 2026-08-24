import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
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

async function resolveVehicleWriteAccessFromDb(
  vehicleId: string,
  userId: string,
): Promise<VehicleWriteAccess> {
  const readVehicle = async () => {
    if (isSupabaseAdminConfigured()) {
      const admin = createAdminClient();
      return admin
        .from("vehicles")
        .select("id, user_id")
        .eq("id", vehicleId)
        .maybeSingle();
    }
    const supabase = await createClient();
    return supabase
      .from("vehicles")
      .select("id, user_id")
      .eq("id", vehicleId)
      .maybeSingle();
  };

  const readContributorGrant = async (resolvedVehicleId: string) => {
    if (isSupabaseAdminConfigured()) {
      const admin = createAdminClient();
      return admin
        .from("vehicle_contributors")
        .select("id")
        .eq("vehicle_id", resolvedVehicleId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
    }
    const supabase = await createClient();
    return supabase
      .from("vehicle_contributors")
      .select("id")
      .eq("vehicle_id", resolvedVehicleId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
  };

  const { data: vehicle, error: vehicleError } = await readVehicle();
  if (vehicleError) {
    console.error("[vehicle-write-access] vehicle lookup failed", vehicleError);
    return denied({ message: "Fahrzeug konnte nicht geladen werden." });
  }

  if (!vehicle?.id || !vehicle.user_id) {
    return denied();
  }

  const asOwner = vehicle.user_id === userId;
  let asContributor = false;

  if (!asOwner) {
    const { data: grant, error: grantError } = await readContributorGrant(
      vehicle.id,
    );
    if (grantError) {
      console.error("[vehicle-write-access] contributor lookup failed", grantError);
      return denied({
        ownerUserId: vehicle.user_id,
        vehicleId: vehicle.id,
        message: "Schrauber-Zugriff konnte nicht geprüft werden.",
      });
    }
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

/**
 * Whether the session user may write documents for this vehicle.
 * Identity + role only — Pro features are gated via `assertVehicleDocumentWrite`.
 */
export async function getVehicleWriteAccess(
  vehicleId: string,
  userId: string,
): Promise<VehicleWriteAccess> {
  if (!vehicleId || !userId) {
    return denied();
  }

  try {
    return await resolveVehicleWriteAccessFromDb(vehicleId, userId);
  } catch (error) {
    console.error("[vehicle-write-access] lookup failed", error);
    return denied({ message: "Datenbankverbindung fehlgeschlagen." });
  }
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
