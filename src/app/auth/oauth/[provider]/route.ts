import { NextResponse, type NextRequest } from "next/server";

import { isOAuthProvider } from "@/lib/auth/oauth-providers";
import { normalizeAuthCallbackNext } from "@/lib/auth/post-login-path-guards";
import { resolveAuthSiteOrigin } from "@/lib/site-origin";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { hardenCookieOptions } from "@/lib/security/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createRouteHandlerClient } from "@/lib/supabase/route";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider: providerRaw } = await context.params;
  if (!isOAuthProvider(providerRaw)) {
    return NextResponse.redirect(new URL("/login?error=oauth_provider", request.url));
  }

  const authOrigin = resolveAuthSiteOrigin(request);
  const { origin } = request.nextUrl;
  if (origin !== authOrigin) {
    const canonical = new URL(request.nextUrl.pathname + request.nextUrl.search, authOrigin);
    return NextResponse.redirect(canonical);
  }

  const limited = await enforceRateLimit(request, "auth", "oauth-start");
  if (limited) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", authOrigin));
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.redirect(new URL("/login?error=unconfigured", authOrigin));
  }

  const next = normalizeAuthCallbackNext(
    request.nextUrl.searchParams.get("next") ?? "/auth/continue",
  );
  const callbackUrl = new URL("/auth/callback", authOrigin);
  callbackUrl.searchParams.set("next", next);

  let cookieCarrier = NextResponse.redirect(callbackUrl);
  const supabase = createRouteHandlerClient(request, cookieCarrier);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerRaw,
    options: {
      redirectTo: callbackUrl.toString(),
      ...(providerRaw === "google"
        ? {
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          }
        : {}),
    },
  });

  if (error || !data.url) {
    const loginUrl = new URL("/login", authOrigin);
    loginUrl.searchParams.set("error", "oauth_start_failed");
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const oauthRedirect = NextResponse.redirect(data.url);
  cookieCarrier.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;
    oauthRedirect.cookies.set(name, value, hardenCookieOptions(options));
  });

  return oauthRedirect;
}
