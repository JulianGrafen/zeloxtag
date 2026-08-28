import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { loadVehicleOwnerUserId } from "@/lib/auth/load-vehicle-owner-id";
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

async function readContributorGrant(vehicleId: string, userId: string) {
  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    return admin
      .from("vehicle_contributors")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
  }
  const supabase = await createClient();
  return supabase
    .from("vehicle_contributors")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
}

async function readOwnedVehicle(vehicleId: string, userId: string) {
  const supabase = await createClient();
  return supabase
    .from("vehicles")
    .select("id, user_id")
    .eq("id", vehicleId)
    .eq("user_id", userId)
    .maybeSingle();
}

async function resolveVehicleWriteAccessFromDb(
  vehicleId: string,
  userId: string,
): Promise<VehicleWriteAccess> {
  const { data: ownedVehicle, error: ownerError } = await readOwnedVehicle(
    vehicleId,
    userId,
  );

  if (ownerError) {
    console.error("[vehicle-write-access] owner lookup failed", ownerError);
    return denied({ message: "Fahrzeug konnte nicht geladen werden." });
  }

  if (ownedVehicle?.id && ownedVehicle.user_id === userId) {
    return {
      ok: true,
      isOwner: true,
      isContributor: false,
      ownerUserId: ownedVehicle.user_id,
      vehicleId: ownedVehicle.id,
    };
  }

  const { data: grant, error: grantError } = await readContributorGrant(
    vehicleId,
    userId,
  );
  if (grantError) {
    console.error("[vehicle-write-access] contributor lookup failed", grantError);
    return denied({
      vehicleId,
      message: "Schrauber-Zugriff konnte nicht geprüft werden.",
    });
  }

  if (!grant) {
    return denied({ vehicleId });
  }

  const ownerUserId = await loadVehicleOwnerUserId(vehicleId);
  if (!ownerUserId) {
    return denied({
      vehicleId,
      message:
        "Schrauber-Zugriff erfordert serverseitige Konfiguration (Service Role).",
    });
  }

  return {
    ok: true,
    isOwner: false,
    isContributor: true,
    ownerUserId,
    vehicleId,
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
