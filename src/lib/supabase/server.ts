import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { authCookieOptions, hardenCookieOptions } from "@/lib/security/cookie-options";
import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

/**
 * Server Supabase client for Server Components, Route Handlers, and Server Actions.
 * Session cookies: HttpOnly + SameSite=Lax + Secure (production).
 */
export async function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, hardenCookieOptions(options));
          });
        } catch {
          // Called from a Server Component — Proxy refreshes sessions.
        }
      },
    },
  });
}
