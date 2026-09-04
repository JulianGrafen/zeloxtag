import { NextResponse, type NextRequest } from "next/server";

import { completePendingClaimForUser } from "@/lib/tags/complete-pending-claim";
import { isGenericPostLoginNext, normalizeAuthCallbackNext } from "@/lib/auth/post-login-path";
import { dashboardTourHref } from "@/lib/onboarding/dashboard-tour";
import { resolveAuthSiteOrigin } from "@/lib/site-origin";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { hardenCookieOptions } from "@/lib/security/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createRouteHandlerClient } from "@/lib/supabase/route";

function mapAuthCallbackError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("pkce") ||
    lower.includes("code verifier") ||
    lower.includes("verifier not found")
  ) {
    return (
      "E-Mail-Bestätigung muss im selben Browser geöffnet werden, in dem du dich registriert hast. " +
      "Bitte erneut in diesem Browser registrieren bzw. den Link hier öffnen."
    );
  }
  return message;
}

/**
 * Email-confirmation / OAuth PKCE callback.
 * Exchanges `code` for a session using request/response cookies so the PKCE
 * verifier and new session cookies travel with the redirect.
 */
export async function GET(request: NextRequest) {
  const authOrigin = resolveAuthSiteOrigin(request);
  const { searchParams, origin } = request.nextUrl;

  if (origin !== authOrigin) {
    const canonicalCallback = new URL("/auth/callback", authOrigin);
    searchParams.forEach((value, key) => {
      canonicalCallback.searchParams.set(key, value);
    });
    return NextResponse.redirect(canonicalCallback);
  }

  const limited = await enforceRateLimit(request, "auth", "auth-callback");
  if (limited) {
    return NextResponse.redirect(
      new URL("/login?error=rate_limited", authOrigin),
    );
  }

  const code = searchParams.get("code");
  const next = normalizeAuthCallbackNext(searchParams.get("next") ?? "/auth/continue");

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.redirect(new URL(next, authOrigin));
  }

  if (!code) {
    return NextResponse.redirect(new URL(next, authOrigin));
  }

  // Temporary redirect target; may be replaced after session + claim resolve.
  let response = NextResponse.redirect(new URL(next, authOrigin));
  const supabase = createRouteHandlerClient(request, response);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", authOrigin);
    loginUrl.searchParams.set("error", mapAuthCallbackError(error.message));
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const copyCookies = (target: NextResponse) => {
    response.cookies.getAll().forEach((cookie) => {
      const { name, value, ...options } = cookie;
      target.cookies.set(name, value, hardenCookieOptions(options));
    });
    return target;
  };

  const userId = data.user?.id ?? data.session?.user?.id;
  if (userId) {
    try {
      const claimResult = await completePendingClaimForUser(userId);
      if (claimResult?.status === "claimed") {
        return copyCookies(
          NextResponse.redirect(
            new URL(dashboardTourHref(claimResult.tagUuid), authOrigin),
          ),
        );
      }
      if (claimResult?.status === "error") {
        const loginUrl = new URL("/login", authOrigin);
        loginUrl.searchParams.set("error", claimResult.message);
        return copyCookies(NextResponse.redirect(loginUrl));
      }
    } catch {
      // Claim is optional on plain login — session cookies already on `response`.
    }

    if (isGenericPostLoginNext(next)) {
      // Cookie-bearing hop; continue resolves /v/{uuid} for owners.
      response = copyCookies(
        NextResponse.redirect(new URL("/auth/continue", authOrigin)),
      );
      return response;
    }
  }

  return response;
}
