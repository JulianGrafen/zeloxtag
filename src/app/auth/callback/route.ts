import { NextResponse, type NextRequest } from "next/server";

import { completePendingClaimForUser } from "@/actions/claim-tag";
import { enforceRateLimit } from "@/lib/security/api-guard";
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
  const limited = enforceRateLimit(request, "auth", "auth-callback");
  if (limited) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", request.nextUrl.origin));
  }

  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.redirect(new URL(next, origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const redirectUrl = new URL(next, origin);
  const response = NextResponse.redirect(redirectUrl);
  const supabase = createRouteHandlerClient(request, response);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", mapAuthCallbackError(error.message));
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const userId = data.user?.id ?? data.session?.user?.id;
  if (userId) {
    try {
      const claimResult = await completePendingClaimForUser(userId);
      if (claimResult?.status === "claimed") {
        // Preserve session cookies set during exchange on this response.
        const claimed = NextResponse.redirect(
          new URL(`/v/${claimResult.tagUuid}`, origin),
        );
        response.cookies.getAll().forEach((cookie) => {
          claimed.cookies.set(cookie);
        });
        return claimed;
      }
      if (claimResult?.status === "error") {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", claimResult.message);
        const failed = NextResponse.redirect(loginUrl);
        response.cookies.getAll().forEach((cookie) => {
          failed.cookies.set(cookie);
        });
        return failed;
      }
    } catch {
      // Claim is optional on plain login — session cookies already on `response`.
    }
  }

  return response;
}
