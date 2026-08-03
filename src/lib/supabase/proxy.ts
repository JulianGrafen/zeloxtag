import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { authCookieOptions, hardenCookieOptions } from "@/lib/security/cookie-options";
import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

export type SessionRefreshResult = {
  response: NextResponse;
  userId: string | null;
  /** True when MFA is enrolled but session is still AAL1. */
  needsMfa: boolean;
};

/**
 * Refreshes the Supabase auth session cookies on each matched request.
 * Must run in Next.js Proxy so Server Components can read a fresh session.
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionRefreshResult> {
  let response = NextResponse.next({ request });
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return { response, userId: null, needsMfa: false };
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, hardenCookieOptions(options));
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // Validates JWT / refreshes tokens — do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let needsMfa = false;
  if (user) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfa =
      aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2";
  }

  return {
    response,
    userId: user?.id ?? null,
    needsMfa,
  };
}
