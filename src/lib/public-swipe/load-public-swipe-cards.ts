import "server-only";

import {
  mapPublicSwipeCardList,
  mapRegisterAnonymousSwipeResult,
  type PublicSwipeCard,
  type RegisterAnonymousSwipeResult,
} from "@/lib/public-swipe/public-swipe-card-map";
import { createClient } from "@/lib/supabase/server";

export async function loadPublicSwipeCards(input: {
  excludeVehicleIds?: string[];
  limit?: number;
  clientSessionHash?: string | null;
}): Promise<PublicSwipeCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_swipe_cards", {
    p_exclude_vehicle_ids: input.excludeVehicleIds ?? [],
    p_limit: input.limit ?? 10,
    p_client_session_hash: input.clientSessionHash ?? undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapPublicSwipeCardList(data);
}

export async function registerAnonymousSwipe(input: {
  vehicleId: string;
  voteType: "up" | "down";
  clientSessionHash: string;
}): Promise<RegisterAnonymousSwipeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_anonymous_swipe", {
    p_vehicle_id: input.vehicleId,
    p_vote_type: input.voteType,
    p_client_session_hash: input.clientSessionHash,
  });

  if (error) {
    throw new Error(error.message);
  }

  const mapped = mapRegisterAnonymousSwipeResult(data);
  if (!mapped) {
    throw new Error("Invalid swipe response");
  }

  return mapped;
}
