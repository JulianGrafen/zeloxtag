import { NextResponse, type NextRequest } from "next/server";

import { completePendingClaimForUser } from "@/lib/tags/complete-pending-claim";
import { isGenericPostLoginNext, normalizeAuthCallbackNext } from "@/lib/auth/post-login-path";
import { dashboardTourHref } from "@/lib/onboarding/dashboard-tour";
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
  const limited = await enforceRateLimit(request, "auth", "auth-callback");
  if (limited) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", request.nextUrl.origin));
  }

  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = normalizeAuthCallbackNext(searchParams.get("next") ?? "/auth/continue");

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.redirect(new URL(next, origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL(next, origin));
  }

  // Temporary redirect target; may be replaced after session + claim resolve.
  let response = NextResponse.redirect(new URL(next, origin));
  const supabase = createRouteHandlerClient(request, response);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", origin);
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
          NextResponse.redirect(new URL(dashboardTourHref(claimResult.tagUuid), origin)),
        );
      }
      if (claimResult?.status === "error") {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", claimResult.message);
        return copyCookies(NextResponse.redirect(loginUrl));
      }
    } catch {
      // Claim is optional on plain login — session cookies already on `response`.
    }

    if (isGenericPostLoginNext(next)) {
      // Cookie-bearing hop; continue resolves /v/{uuid} for owners.
      response = copyCookies(
        NextResponse.redirect(new URL("/auth/continue", origin)),
      );
      return response;
    }
  }

  return response;
}
