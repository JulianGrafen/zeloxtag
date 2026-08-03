import { createBrowserClient } from "@supabase/ssr";

import { authCookieOptions } from "@/lib/security/cookie-options";
import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

/**
 * Browser Supabase client for Client Components.
 * Prefer Server Actions for auth mutations so HttpOnly session cookies stay server-set.
 * Call inside the component / event handler — not at module top level.
 */
export function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient<Database>(url, anonKey, {
    cookieOptions: {
      ...authCookieOptions(),
      // Browser storage cannot set HttpOnly; server/proxy remains source of truth.
      httpOnly: false,
    },
  });
}
