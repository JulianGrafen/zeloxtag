import { NextResponse, type NextRequest } from "next/server";

import { normalizeAuthCallbackNext } from "@/lib/auth/post-login-path";
import { getSiteUrl } from "@/lib/auth/site-url";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { hardenCookieOptions } from "@/lib/security/cookie-options";
import { publicAuthMessage } from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createRouteHandlerClient } from "@/lib/supabase/route";

/**
 * Starts Google OAuth from a Route Handler so the PKCE code verifier is
 * written onto the redirect response cookies (Server Actions are unreliable here).
 */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;

  const limited = await enforceRateLimit(request, "auth", "oauth-google");
  if (limited) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", origin));
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      "Supabase ist nicht konfiguriert. Setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return NextResponse.redirect(loginUrl);
  }

  const next = normalizeAuthCallbackNext(
    request.nextUrl.searchParams.get("next") ?? "/auth/continue",
  );
  const siteUrl = await getSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const cookieResponse = NextResponse.redirect(new URL("/login", origin));
  const supabase = createRouteHandlerClient(request, cookieResponse);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      publicAuthMessage(error, "Google-Anmeldung konnte nicht gestartet werden."),
    );
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const oauthRedirect = NextResponse.redirect(data.url);
  cookieResponse.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;
    oauthRedirect.cookies.set(name, value, hardenCookieOptions(options));
  });

  return oauthRedirect;
}
