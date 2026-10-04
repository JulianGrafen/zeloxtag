import "server-only";

import { cache } from "react";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

export const isVehicleBuildStoryPublic = cache(
  async (vehicleId: string): Promise<boolean> => {
    if (!isSupabaseAdminConfigured()) return false;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("vehicles")
      .select("is_public, is_story_public")
      .eq("id", vehicleId)
      .maybeSingle();

    if (error || !data) return false;
    return data.is_public === true && data.is_story_public === true;
  },
);
