"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { fetchUserGarage } from "@/lib/garage/fetch-user-garage";
import { rememberActiveTagUuid } from "@/lib/garage/remember-active-tag";
import type { GarageVehicle } from "@/lib/garage/types";
import { createClient } from "@/lib/supabase/server";

export async function refreshUserGarageAction(): Promise<GarageVehicle[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  return fetchUserGarage(supabase);
}

export async function rememberActiveGarageTagAction(
  tagUuid: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Nicht angemeldet." };
  }
  const trimmed = tagUuid.trim();
  if (!trimmed) {
    return { ok: false, message: "Tag fehlt." };
  }

  const supabase = await createClient();
  const garage = await fetchUserGarage(supabase);
  if (!garage.some((entry) => entry.tagUuid === trimmed)) {
    return { ok: false, message: "Fahrzeug nicht in deiner Garage." };
  }

  await rememberActiveTagUuid(trimmed);
  return { ok: true };
}
