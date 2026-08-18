import { randomUUID } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_MINT_BATCH, parseMintCount } from "@/lib/tags/mint-batch";

export type CreatedUnclaimedTag = {
  id: string;
  uuid: string;
};

export { MAX_MINT_BATCH, parseMintCount };

/**
 * Mint a fresh unclaimed ZeloxTag (inventory / next QR plaque).
 * Uses service role — there is no public INSERT policy on `tags`.
 */
export async function createUnclaimedTag(): Promise<CreatedUnclaimedTag> {
  const [tag] = await createUnclaimedTags(1);
  if (!tag) {
    throw new Error("Neuer Tag konnte nicht angelegt werden: leer.");
  }
  return tag;
}

export async function createUnclaimedTags(
  count: number,
): Promise<CreatedUnclaimedTag[]> {
  const n = parseMintCount(count);
  if (!n) {
    throw new Error(`Anzahl muss zwischen 1 und ${MAX_MINT_BATCH} liegen.`);
  }

  const admin = createAdminClient();
  const payload = Array.from({ length: n }, () => ({
    uuid: randomUUID(),
    status: "unclaimed" as const,
    vehicle_id: null,
  }));

  const { data, error } = await admin
    .from("tags")
    .insert(payload)
    .select("id, uuid");

  if (error || !data || data.length !== n) {
    throw new Error(
      `Neuer Tag konnte nicht angelegt werden: ${error?.message ?? "unbekannt"}`,
    );
  }

  return data.map((row) => ({ id: row.id, uuid: row.uuid }));
}
