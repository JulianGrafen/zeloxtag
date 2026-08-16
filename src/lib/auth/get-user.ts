import { cache } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Authenticated Supabase user, or null when logged out / unconfigured.
 * Request-memoized — pages + access helpers share one Auth round-trip.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
