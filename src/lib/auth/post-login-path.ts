import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { rememberActiveTagUuid } from "@/lib/garage/remember-active-tag";
import {
  isGenericPostLoginNext,
  sanitizePostLoginPath,
} from "@/lib/auth/post-login-path-guards";
import { createClient } from "@/lib/supabase/server";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

export {
  isDemoOrShowcasePath,
  isGenericPostLoginNext,
  normalizeAuthCallbackNext,
  sanitizePostLoginPath,
} from "@/lib/auth/post-login-path-guards";

const FALLBACK = "/dashboard";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VehicleRow = { id?: string | null };

function vehiclePath(tagUuid: string): string | null {
  if (isDemoActiveTag(tagUuid) || tagUuid === MOCK_TAG_UUIDS.unclaimed) {
    return null;
  }
  return `/v/${tagUuid}`;
}

function digitalGaragePath(vehicleId: string): string {
  return `/garage/${vehicleId}`;
}

/**
 * Destination after successful login / MFA / auth callback.
 * Prefer the owner's active ZeloxTag vehicle dashboard (`/v/{uuid}`).
 */
export async function resolvePostLoginPath(userId: string): Promise<string> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !userId) return FALLBACK;

  try {
    const fromMeta = await resolveViaUserMetadata(userId);
    if (fromMeta) return sanitizePostLoginPath(fromMeta);

    // Admin first: reliable after cookie races on the login action itself.
    const fromAdmin = await resolveViaAdmin(userId);
    if (fromAdmin) {
      void rememberActiveTag(fromAdmin);
      return sanitizePostLoginPath(fromAdmin);
    }

    const fromSession = await resolveViaSessionUser(userId);
    if (fromSession) {
      void rememberActiveTag(fromSession);
      return sanitizePostLoginPath(fromSession);
    }

    const fromContributor = await resolveViaContributorGrant(userId);
    if (fromContributor) {
      void rememberActiveTag(fromContributor);
      return sanitizePostLoginPath(fromContributor);
    }
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
  if (!UUID_RE.test(tagUuid)) return null;

  if (isSupabaseAdminConfigured()) {
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

    if (vehicle) return vehiclePath(tag.uuid);

    const contributor = await isActiveContributor(userId, tag.vehicle_id);
    if (contributor) return vehiclePath(tag.uuid);

    return null;
  }

  // RLS: tags_select_own only returns the row if the vehicle belongs to auth.uid().
  const { data: tag } = await supabase
    .from("tags")
    .select("uuid")
    .eq("uuid", tagUuid)
    .eq("status", "active")
    .maybeSingle();

  return tag?.uuid ? vehiclePath(tag.uuid) : null;
}

async function resolveViaAdmin(userId: string): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const admin = createAdminClient();
  const { data: vehicles, error: vehicleError } = await admin
    .from("vehicles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(10);

  if (vehicleError || !vehicles?.length) return null;

  for (const vehicle of vehicles as VehicleRow[]) {
    if (!vehicle.id) continue;
    const { data: tag } = await admin
      .from("tags")
      .select("uuid")
      .eq("vehicle_id", vehicle.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (tag?.uuid && typeof tag.uuid === "string") {
      return vehiclePath(tag.uuid);
    }
    return digitalGaragePath(vehicle.id);
  }

  return null;
}

async function resolveViaSessionUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error || !vehicles?.length) return null;

  for (const vehicle of vehicles as VehicleRow[]) {
    if (!vehicle.id) continue;
    const { data: tag } = await supabase
      .from("tags")
      .select("uuid")
      .eq("vehicle_id", vehicle.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (tag?.uuid && typeof tag.uuid === "string") {
      return vehiclePath(tag.uuid);
    }
    return digitalGaragePath(vehicle.id);
  }

  return null;
}

async function isActiveContributor(
  userId: string,
  vehicleId: string,
): Promise<boolean> {
  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("vehicle_contributors")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    return Boolean(data);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicle_contributors")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

async function resolveViaContributorGrant(
  userId: string,
): Promise<string | null> {
  const { data: grants, error } = isSupabaseAdminConfigured()
    ? await createAdminClient()
        .from("vehicle_contributors")
        .select("vehicle_id, accepted_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("accepted_at", { ascending: false })
        .limit(5)
    : await (await createClient())
        .from("vehicle_contributors")
        .select("vehicle_id, accepted_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("accepted_at", { ascending: false })
        .limit(5);

  if (error || !grants?.length) return null;

  for (const grant of grants) {
    const vehicleId = grant.vehicle_id;
    if (!vehicleId) continue;

    const { data: tag } = isSupabaseAdminConfigured()
      ? await createAdminClient()
          .from("tags")
          .select("uuid")
          .eq("vehicle_id", vehicleId)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : await (await createClient())
          .from("tags")
          .select("uuid")
          .eq("vehicle_id", vehicleId)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

    if (tag?.uuid && typeof tag.uuid === "string") {
      return vehiclePath(tag.uuid);
    }
    return digitalGaragePath(vehicleId);
  }

  return null;
}

/** Cache tag on the auth user so the next login skips the DB round-trip. */
async function rememberActiveTag(path: string): Promise<void> {
  const tagUuid = path.startsWith("/v/") ? path.slice(3).split("/")[0] : null;
  if (!tagUuid || !UUID_RE.test(tagUuid) || isDemoActiveTag(tagUuid)) return;
  await rememberActiveTagUuid(tagUuid);
}
