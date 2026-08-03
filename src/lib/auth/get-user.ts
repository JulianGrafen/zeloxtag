import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { User as AuthUser } from "@supabase/supabase-js";

/**
 * Returns the authenticated Supabase user, or null when logged out / unconfigured.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
