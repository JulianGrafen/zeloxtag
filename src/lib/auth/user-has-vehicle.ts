import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function userHasGarageVehicle(userId: string): Promise<boolean> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !userId) return false;

  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) return false;
    return (count ?? 0) > 0;
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true });
  if (error) return false;
  return (count ?? 0) > 0;
}
