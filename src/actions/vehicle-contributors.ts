"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ACTIVE_OR_PENDING = 20;

export type ContributorRow = {
  id: string;
  label: string | null;
  status: "invited" | "active" | "revoked";
  role: "schrauber";
  inviteToken: string | null;
  userEmail: string | null;
  createdAt: string;
  acceptedAt: string | null;
  expiresAt: string | null;
};

export type ContributorActionResult =
  | { status: "ok"; inviteUrl?: string; contributors?: ContributorRow[] }
  | { status: "error"; message: string };

function invitePath(token: string): string {
  return `/einladung/${token}`;
}

async function assertOwnerOfVehicle(
  vehicleId: string,
  userId: string,
): Promise<{ tagUuid: string } | { error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY fehlt." };
  }
  const admin = createAdminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, user_id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (!vehicle || vehicle.user_id !== userId) {
    return { error: "Kein Zugriff auf dieses Fahrzeug." };
  }

  const { data: tag } = await admin
    .from("tags")
    .select("uuid")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return { tagUuid: tag?.uuid ?? "" };
}

async function mapContributorRows(
  rows: Array<{
    id: string;
    label: string | null;
    status: string;
    role: string;
    invite_token: string;
    user_id: string | null;
    created_at: string;
    accepted_at: string | null;
    expires_at: string | null;
  }>,
): Promise<ContributorRow[]> {
  const admin = isSupabaseAdminConfigured() ? createAdminClient() : null;
  const out: ContributorRow[] = [];

  for (const row of rows) {
    let userEmail: string | null = null;
    if (row.user_id && admin) {
      try {
        const { data } = await admin.auth.admin.getUserById(row.user_id);
        userEmail = data.user?.email ?? null;
      } catch {
        userEmail = null;
      }
    }
    out.push({
      id: row.id,
      label: row.label,
      status: row.status as ContributorRow["status"],
      role: "schrauber",
      inviteToken: row.status === "invited" ? row.invite_token : null,
      userEmail,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      expiresAt: row.expires_at,
    });
  }

  return out;
}

export async function listVehicleContributors(
  vehicleId: string,
): Promise<ContributorActionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Nicht angemeldet." };

  const owned = await assertOwnerOfVehicle(vehicleId, user.id);
  if ("error" in owned) return { status: "error", message: owned.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicle_contributors")
    .select(
      "id, label, status, role, invite_token, user_id, created_at, accepted_at, expires_at",
    )
    .eq("vehicle_id", vehicleId)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  if (error) return { status: "error", message: error.message };

  const contributors = await mapContributorRows(data ?? []);
  return { status: "ok", contributors };
}

export async function createSchrauberInvite(
  vehicleId: string,
  labelRaw?: string,
): Promise<ContributorActionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Nicht angemeldet." };

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Supabase ist nicht konfiguriert." };
  }

  const owned = await assertOwnerOfVehicle(vehicleId, user.id);
  if ("error" in owned) return { status: "error", message: owned.error };

  const admin = createAdminClient();
  const { count } = await admin
    .from("vehicle_contributors")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .in("status", ["invited", "active"]);

  if ((count ?? 0) >= MAX_ACTIVE_OR_PENDING) {
    return {
      status: "error",
      message: "Maximale Anzahl Schrauber-Einladungen erreicht.",
    };
  }

  const token = randomBytes(24).toString("base64url");
  const label = labelRaw?.trim().slice(0, 80) || null;
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { error } = await admin.from("vehicle_contributors").insert({
    vehicle_id: vehicleId,
    user_id: null,
    role: "schrauber",
    status: "invited",
    invite_token: token,
    label,
    invited_by: user.id,
    expires_at: expiresAt,
  });

  if (error) return { status: "error", message: error.message };

  if (owned.tagUuid) {
    revalidatePath(`/v/${owned.tagUuid}`);
    revalidatePath(`/v/${owned.tagUuid}/schrauber`);
  }

  return { status: "ok", inviteUrl: invitePath(token) };
}

export async function revokeSchrauberInvite(
  vehicleId: string,
  contributorId: string,
): Promise<ContributorActionResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Nicht angemeldet." };

  const owned = await assertOwnerOfVehicle(vehicleId, user.id);
  if ("error" in owned) return { status: "error", message: owned.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicle_contributors")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", contributorId)
    .eq("vehicle_id", vehicleId);

  if (error) return { status: "error", message: error.message };

  if (owned.tagUuid) {
    revalidatePath(`/v/${owned.tagUuid}`);
    revalidatePath(`/v/${owned.tagUuid}/schrauber`);
  }

  return listVehicleContributors(vehicleId);
}

export type InvitePreview =
  | {
      status: "ok";
      label: string | null;
      vehicleLabel: string;
      tagUuid: string;
      expired: boolean;
      alreadyActive: boolean;
    }
  | { status: "error"; message: string };

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  if (!token || token.length < 16 || !isSupabaseAdminConfigured()) {
    return { status: "error", message: "Ungültige Einladung." };
  }

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("vehicle_contributors")
    .select(
      "id, label, status, vehicle_id, user_id, expires_at, invite_token",
    )
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite) {
    return { status: "error", message: "Einladung nicht gefunden." };
  }

  if (invite.status === "revoked") {
    return { status: "error", message: "Diese Einladung wurde widerrufen." };
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, make, model, year")
    .eq("id", invite.vehicle_id)
    .maybeSingle();

  if (!vehicle) {
    return { status: "error", message: "Fahrzeug nicht gefunden." };
  }

  const { data: tag } = await admin
    .from("tags")
    .select("uuid")
    .eq("vehicle_id", vehicle.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const expired = Boolean(
    invite.expires_at && new Date(invite.expires_at).getTime() < Date.now(),
  );

  const session = await getCurrentUser();
  const alreadyActive =
    invite.status === "active" &&
    Boolean(session?.id && invite.user_id === session.id);

  return {
    status: "ok",
    label: invite.label,
    vehicleLabel: `${vehicle.make} ${vehicle.model}${
      vehicle.year ? ` · ${vehicle.year}` : ""
    }`,
    tagUuid: tag?.uuid ?? "",
    expired,
    alreadyActive,
  };
}

export async function acceptSchrauberInvite(
  token: string,
): Promise<ContributorActionResult & { tagUuid?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Bitte zuerst anmelden." };
  }

  if (!token || !isSupabaseAdminConfigured()) {
    return { status: "error", message: "Ungültige Einladung." };
  }

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("vehicle_contributors")
    .select("*")
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite) {
    return { status: "error", message: "Einladung nicht gefunden." };
  }
  if (invite.status === "revoked") {
    return { status: "error", message: "Einladung wurde widerrufen." };
  }
  if (
    invite.expires_at &&
    new Date(invite.expires_at).getTime() < Date.now()
  ) {
    return { status: "error", message: "Einladung ist abgelaufen." };
  }

  if (invite.status === "active" && invite.user_id === user.id) {
    const { data: tag } = await admin
      .from("tags")
      .select("uuid")
      .eq("vehicle_id", invite.vehicle_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    return { status: "ok", tagUuid: tag?.uuid };
  }

  if (invite.status === "active" && invite.user_id !== user.id) {
    return {
      status: "error",
      message: "Einladung wurde bereits von einem anderen Konto angenommen.",
    };
  }

  // Already an active Schrauber on this vehicle — consume pending invite.
  const { data: existing } = await admin
    .from("vehicle_contributors")
    .select("id")
    .eq("vehicle_id", invite.vehicle_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    await admin
      .from("vehicle_contributors")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", invite.id)
      .eq("status", "invited");
  } else {
    const { error } = await admin
      .from("vehicle_contributors")
      .update({
        status: "active",
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id)
      .eq("status", "invited");

    if (error) return { status: "error", message: error.message };
  }

  const { data: tag } = await admin
    .from("tags")
    .select("uuid")
    .eq("vehicle_id", invite.vehicle_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const tagUuid = tag?.uuid ?? "";
  if (tagUuid) {
    revalidatePath(`/v/${tagUuid}`);
  }

  // Touch session metadata so post-login can land on a workshop vehicle.
  try {
    if (tagUuid) {
      const supabase = await createClient();
      await supabase.auth.updateUser({
        data: { active_tag_uuid: tagUuid },
      });
    }
  } catch {
    /* non-fatal */
  }

  return { status: "ok", tagUuid };
}
