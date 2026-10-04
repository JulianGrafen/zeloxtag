import "server-only";

import {
  mapSwipeCandidateToCard,
  type ShowcaseSwipeCandidateRow,
} from "@/lib/showcase/swipe-card-dto";
import { parseJsonbRpcArray } from "@/lib/showcase/parse-jsonb-rpc-array";
import type {
  ShowcaseSwipeCard,
  ShowcaseSwipeInboxRow,
} from "@/lib/showcase/swipe-types";
import { createClient } from "@/lib/supabase/server";

export async function loadShowcaseSwipeDeck(
  limit = 15,
): Promise<ShowcaseSwipeCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_showcase_swipe_candidates", {
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = parseJsonbRpcArray(data);

  const cards: ShowcaseSwipeCard[] = [];
  for (const entry of rows) {
    if (!entry || typeof entry !== "object") continue;
    const card = mapSwipeCandidateToCard(entry as ShowcaseSwipeCandidateRow);
    if (card) cards.push(card);
  }
  return cards;
}

export async function loadOwnerVehicleSwipeLikeCounts(
  vehicleId: string,
): Promise<{ totalLikes: number; unreadLikes: number }> {
  const inbox = await loadShowcaseSwipeInboxSummary();
  const row = inbox.find((entry) => entry.vehicleId === vehicleId);
  return {
    totalLikes: row?.totalLikes ?? 0,
    unreadLikes: row?.unreadLikes ?? 0,
  };
}

export async function loadShowcaseSwipeInboxSummary(): Promise<
  ShowcaseSwipeInboxRow[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_showcase_swipe_inbox_summary");

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const vehicleId = typeof row.vehicle_id === "string" ? row.vehicle_id : "";
      if (!vehicleId) return null;
      return {
        vehicleId,
        tagUuid: typeof row.tag_uuid === "string" ? row.tag_uuid : null,
        make: typeof row.make === "string" ? row.make : "",
        model: typeof row.model === "string" ? row.model : "",
        totalLikes:
          typeof row.total_likes === "number" ? row.total_likes : 0,
        unreadLikes:
          typeof row.unread_likes === "number" ? row.unread_likes : 0,
      } satisfies ShowcaseSwipeInboxRow;
    })
    .filter((row): row is ShowcaseSwipeInboxRow => row != null);
}
