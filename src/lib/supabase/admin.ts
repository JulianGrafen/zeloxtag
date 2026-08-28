// Build-time guard: importing this module from a client bundle must fail loudly
// rather than shipping SUPABASE_SERVICE_ROLE_KEY to the browser.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

/**
 * Service-role client (bypasses RLS). Server-only — never import in client code.
 * Untyped against generated Database to avoid supabase-js generic regressions.
 */
function readServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    ""
  );
}

export function createAdminClient(): SupabaseClient {
  const { url, isConfigured } = getSupabaseEnv();
  const serviceRoleKey = readServiceRoleKey();

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
    global: {
      // Next.js patches global fetch and may cache GET (PostgREST selects).
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
        }),
    },
  });
}

export function isSupabaseAdminConfigured(): boolean {
  const { isConfigured } = getSupabaseEnv();
  return isConfigured && Boolean(readServiceRoleKey());
}
