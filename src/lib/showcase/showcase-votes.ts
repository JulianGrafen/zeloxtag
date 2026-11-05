import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type ShowcaseVoteResult =
  | { status: "ok"; total: number; alreadyVoted: boolean }
  | { status: "own_vehicle"; total: number }
  | { status: "error" };

/** Signed-in voters are keyed by account so one person = one vote across devices. */
export function voterHashForUser(userId: string): string {
  return createHash("sha256").update(`user:${userId}`).digest("hex");
}

export async function loadShowcaseVoteTotal(vehicleId: string): Promise<number> {
  if (!isSupabaseAdminConfigured()) return 0;
  try {
    const { data, error } = await createAdminClient().rpc("showcase_vote_total", {
      p_vehicle_id: vehicleId,
    });
    if (error) {
      // Migration 00099 not applied yet — showcase still renders.
      console.error("[showcase-votes] total failed", error.message);
      return 0;
    }
    return typeof data === "number" ? data : Number(data) || 0;
  } catch {
    return 0;
  }
}

export async function castShowcaseVote(input: {
  vehicleId: string;
  voterHash: string;
  userId: string | null;
}): Promise<ShowcaseVoteResult> {
  if (!isSupabaseAdminConfigured()) return { status: "error" };
  const { data, error } = await createAdminClient().rpc("cast_showcase_vote", {
    p_vehicle_id: input.vehicleId,
    p_voter_hash: input.voterHash,
    p_user_id: input.userId,
  });
  if (error || !data || typeof data !== "object") {
    console.error("[showcase-votes] cast failed", error?.message);
    return { status: "error" };
  }
  const row = data as { ok?: boolean; reason?: string; already_voted?: boolean; total?: number };
  const total = Number(row.total) || 0;
  if (row.ok === false && row.reason === "own_vehicle") {
    return { status: "own_vehicle", total };
  }
  return { status: "ok", total, alreadyVoted: Boolean(row.already_voted) };
}
