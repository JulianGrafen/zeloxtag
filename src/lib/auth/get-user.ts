import { cache } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Authenticated Supabase user, or null when logged out / unconfigured.
 * Request-memoized — pages + access helpers share one Auth round-trip.
 */
async function readAuthenticatedUser(): Promise<AuthUser | null> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("[auth] getUser failed", error);
    return null;
  }
}

/** Request-memoized — Server Components + actions share one Auth round-trip. */
export const getCurrentUser = cache(readAuthenticatedUser);

/** Route handlers — no React `cache()` (can throw across bundled server chunks). */
export async function getApiRouteUser(): Promise<AuthUser | null> {
  return readAuthenticatedUser();
}
