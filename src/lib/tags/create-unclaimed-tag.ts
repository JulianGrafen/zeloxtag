import { randomUUID } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type CreatedUnclaimedTag = {
  id: string;
  uuid: string;
};

/**
 * Mint a fresh unclaimed ZeloxTag (inventory / next QR plaque).
 * Uses service role — there is no public INSERT policy on `tags`.
 */
export async function createUnclaimedTag(): Promise<CreatedUnclaimedTag> {
  const admin = createAdminClient();
  const uuid = randomUUID();

  const { data, error } = await admin
    .from("tags")
    .insert({
      uuid,
      status: "unclaimed",
      vehicle_id: null,
    })
    .select("id, uuid")
    .single();

  if (error || !data) {
    throw new Error(
      `Neuer Tag konnte nicht angelegt werden: ${error?.message ?? "unbekannt"}`,
    );
  }

  return { id: data.id, uuid: data.uuid };
}
