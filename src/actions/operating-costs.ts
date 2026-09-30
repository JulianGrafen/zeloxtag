"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getVehicleWriteAccess } from "@/lib/auth/vehicle-write-access";
import { garagePathForVehicle } from "@/lib/vehicle-surface/paths";
import {
  revalidateOwnerVehicleSurfaces,
  resolveRevalidationScope,
} from "@/lib/vehicle-surface/revalidate-paths";
import { normalizeOperatingCostInput } from "@/lib/vehicles/operating-costs/normalize";
import type { OperatingCostFormInput } from "@/lib/vehicles/operating-costs/types";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type OperatingCostActionResult =
  | { status: "ok" }
  | { status: "error"; message: string };

async function revalidateOperatingCostPaths(
  vehicleId: string,
  entryId?: string,
): Promise<void> {
  await revalidateOwnerVehicleSurfaces(vehicleId, ["", "/tanken", "/kosten"]);
  if (!entryId) return;

  const scope = await resolveRevalidationScope(vehicleId);
  revalidatePath(`${garagePathForVehicle(scope.vehicleId)}/tanken/${entryId}`);
  if (scope.linkedTagUuid) {
    revalidatePath(`/v/${scope.linkedTagUuid}/tanken/${entryId}`);
  }
}

async function resolveOwnerVehicle(
  vehicleId: string,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; message: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Bitte anmelden." };
  }

  const access = await getVehicleWriteAccess(vehicleId, user.id);
  if (!access.ok || !access.isOwner) {
    return { ok: false, message: "Nur der Fahrzeughalter kann Kosten eintragen." };
  }

  return { ok: true, userId: user.id };
}

export async function createOperatingCost(input: {
  tagUuid?: string;
  vehicleId: string;
  form: OperatingCostFormInput;
}): Promise<OperatingCostActionResult> {
  const vehicleId = input.vehicleId.trim();
  if (!vehicleId) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  const normalized = normalizeOperatingCostInput(input.form);
  if (!normalized.ok) {
    return { status: "error", message: normalized.message };
  }

  const owner = await resolveOwnerVehicle(vehicleId);
  if (!owner.ok) {
    return { status: "error", message: owner.message };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Speichern ist lokal nicht verfügbar." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_operating_costs").insert({
    vehicle_id: vehicleId,
    user_id: owner.userId,
    category: normalized.value.category,
    amount_eur: normalized.value.amountEur,
    occurred_on: normalized.value.occurredOn,
    billing_period: normalized.value.billingPeriod,
    note: normalized.value.note,
    fuel_liters: normalized.value.fuelLiters,
    odometer_km: normalized.value.odometerKm,
  });

  if (error) {
    console.error("[operating-costs] insert failed", error);
    return { status: "error", message: "Eintrag konnte nicht gespeichert werden." };
  }

  await revalidateOperatingCostPaths(vehicleId);
  return { status: "ok" };
}

export async function updateOperatingCost(input: {
  tagUuid?: string;
  vehicleId: string;
  entryId: string;
  form: OperatingCostFormInput;
}): Promise<OperatingCostActionResult> {
  const vehicleId = input.vehicleId.trim();
  const entryId = input.entryId.trim();
  if (!vehicleId || !entryId) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  const normalized = normalizeOperatingCostInput(input.form);
  if (!normalized.ok) {
    return { status: "error", message: normalized.message };
  }

  const owner = await resolveOwnerVehicle(vehicleId);
  if (!owner.ok) {
    return { status: "error", message: owner.message };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Speichern ist lokal nicht verfügbar." };
  }

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("vehicle_operating_costs")
    .select("id, category")
    .eq("id", entryId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (loadError || !existing) {
    return { status: "error", message: "Eintrag nicht gefunden." };
  }

  if (existing.category !== normalized.value.category) {
    return { status: "error", message: "Kategorie kann hier nicht geändert werden." };
  }

  const { error } = await supabase
    .from("vehicle_operating_costs")
    .update({
      category: normalized.value.category,
      amount_eur: normalized.value.amountEur,
      occurred_on: normalized.value.occurredOn,
      billing_period: normalized.value.billingPeriod,
      note: normalized.value.note,
      fuel_liters: normalized.value.fuelLiters,
      odometer_km: normalized.value.odometerKm,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("vehicle_id", vehicleId);

  if (error) {
    console.error("[operating-costs] update failed", error);
    return { status: "error", message: "Eintrag konnte nicht gespeichert werden." };
  }

  await revalidateOperatingCostPaths(vehicleId, entryId);
  return { status: "ok" };
}

export async function deleteOperatingCost(input: {
  tagUuid?: string;
  vehicleId: string;
  entryId: string;
}): Promise<OperatingCostActionResult> {
  const vehicleId = input.vehicleId.trim();
  const entryId = input.entryId.trim();
  if (!vehicleId || !entryId) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  const owner = await resolveOwnerVehicle(vehicleId);
  if (!owner.ok) {
    return { status: "error", message: owner.message };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Löschen ist lokal nicht verfügbar." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicle_operating_costs")
    .delete()
    .eq("id", entryId)
    .eq("vehicle_id", vehicleId);

  if (error) {
    console.error("[operating-costs] delete failed", error);
    return { status: "error", message: "Eintrag konnte nicht gelöscht werden." };
  }

  await revalidateOperatingCostPaths(vehicleId);
  return { status: "ok" };
}
