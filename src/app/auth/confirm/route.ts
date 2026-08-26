import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { completePendingClaimForUser } from "@/actions/claim-tag";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { hardenCookieOptions } from "@/lib/security/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createRouteHandlerClient } from "@/lib/supabase/route";

const ALLOWED_TYPES = new Set<EmailOtpType>([
  "recovery",
  "signup",
  "invite",
  "magiclink",
  "email",
]);

/**
 * Token-hash confirmation for custom emails (Resend recovery links).
 * Verifies OTP server-side and sets HttpOnly session cookies on the redirect.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "auth", "auth-confirm");
  if (limited) {
    return NextResponse.redirect(
      new URL("/login?error=rate_limited", request.nextUrl.origin),
    );
  }

  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash")?.trim() ?? "";
  const typeRaw = (searchParams.get("type")?.trim() ?? "") as EmailOtpType;
  const nextRaw = searchParams.get("next") ?? "/login/update-password";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/login/update-password";

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !tokenHash || !ALLOWED_TYPES.has(typeRaw)) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      "Ungültiger oder abgelaufener Bestätigungslink.",
    );
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.redirect(new URL(next, origin));
  const supabase = createRouteHandlerClient(request, response);

  const { data, error } = await supabase.auth.verifyOtp({
    type: typeRaw,
    token_hash: tokenHash,
  });

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      typeRaw === "magiclink"
        ? "Link ungültig oder abgelaufen. Bitte erneut einen Anmelde-Link anfordern."
        : "Link ungültig oder abgelaufen. Bitte erneut Passwort zurücksetzen.",
    );
    if (next.startsWith("/einladung/")) {
      loginUrl.pathname = next;
    }
    return NextResponse.redirect(loginUrl);
  }

  const copyCookies = (target: NextResponse) => {
    response.cookies.getAll().forEach((cookie) => {
      const { name, value, ...options } = cookie;
      target.cookies.set(name, value, hardenCookieOptions(options));
    });
    return target;
  };

  // Recovery → always land on password update (ignore claim continue).
  if (typeRaw === "recovery") {
    return copyCookies(
      NextResponse.redirect(new URL("/login/update-password", origin)),
    );
  }

  if (typeRaw === "signup") {
    return copyCookies(
      NextResponse.redirect(new URL("/auth/continue", origin)),
    );
  }

  const userId = data.user?.id ?? data.session?.user?.id;
  if (userId) {
    try {
      const claimResult = await completePendingClaimForUser(userId);
      if (claimResult?.status === "claimed") {
        return copyCookies(
          NextResponse.redirect(new URL(`/v/${claimResult.tagUuid}`, origin)),
        );
      }
    } catch {
      /* optional */
    }
  }

  return response;
}
