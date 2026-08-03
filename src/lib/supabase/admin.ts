import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

/**
 * Service-role client (bypasses RLS). Server-only — never import in client code.
 * Untyped against generated Database to avoid supabase-js generic regressions.
 */
export function createAdminClient(): SupabaseClient {
  const { url, isConfigured } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!isConfigured || !serviceRoleKey) {
    throw new Error(
      "Supabase admin is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function isSupabaseAdminConfigured(): boolean {
  const { isConfigured } = getSupabaseEnv();
  return isConfigured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
