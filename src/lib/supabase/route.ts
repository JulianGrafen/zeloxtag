import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";

import { authCookieOptions, hardenCookieOptions } from "@/lib/security/cookie-options";
import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Route Handlers (e.g. `/auth/callback`).
 * Reads PKCE / session cookies from the request and writes updates onto the
 * redirect response — required for `exchangeCodeForSession`.
 */
export function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, anonKey, isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, hardenCookieOptions(options));
        });
      },
    },
  });
}
