import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const FALLBACK = "/dashboard";

type VehicleRow = { id?: string | null };

/**
 * Destination after successful login / MFA.
 * Prefer the owner's active ZeloxTag vehicle dashboard when one exists.
 */
export async function resolvePostLoginPath(userId: string): Promise<string> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !userId) return FALLBACK;

  try {
    const fromMeta = await resolveViaUserMetadata(userId);
    if (fromMeta) return fromMeta;

    const fromAdmin = await resolveViaAdmin(userId);
    if (fromAdmin) return fromAdmin;

    const fromSession = await resolveViaSessionUser(userId);
    if (fromSession) return fromSession;
  } catch {
    // Fall through to account hub.
  }

  return FALLBACK;
}

async function resolveViaUserMetadata(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return null;

  const raw = user.user_metadata?.active_tag_uuid;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const tagUuid = raw.trim();

  if (!isSupabaseAdminConfigured()) return null;

  const admin = createAdminClient();
  const { data: tag } = await admin
    .from("tags")
    .select("uuid, vehicle_id, status")
    .eq("uuid", tagUuid)
    .eq("status", "active")
    .maybeSingle();

  if (!tag?.uuid || !tag.vehicle_id) return null;

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("id", tag.vehicle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!vehicle) return null;
  return `/v/${tag.uuid}`;
}

async function resolveViaAdmin(userId: string): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const admin = createAdminClient();
  const { data: vehicles, error: vehicleError } = await admin
    .from("vehicles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (vehicleError || !vehicles?.length) return null;

  for (const vehicle of vehicles as VehicleRow[]) {
    if (!vehicle.id) continue;
    const { data: tag } = await admin
      .from("tags")
      .select("uuid")
      .eq("vehicle_id", vehicle.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (tag?.uuid && typeof tag.uuid === "string") {
      return `/v/${tag.uuid}`;
    }
  }

  return null;
}

async function resolveViaSessionUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !vehicles?.length) return null;

  for (const vehicle of vehicles as VehicleRow[]) {
    if (!vehicle.id) continue;
    const { data: tag } = await supabase
      .from("tags")
      .select("uuid")
      .eq("vehicle_id", vehicle.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (tag?.uuid && typeof tag.uuid === "string") {
      return `/v/${tag.uuid}`;
    }
  }

  return null;
}
