import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { completePendingClaimForUser } from "@/lib/tags/complete-pending-claim";
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

const EMAIL_CONFIRM_SUCCESS_PATH = "/auth/confirmed";

function resolvePostConfirmPath(type: EmailOtpType, next: string): string {
  if (type === "recovery") {
    return "/login/update-password";
  }

  if (
    type === "signup" ||
    type === "magiclink" ||
    type === "email" ||
    type === "invite"
  ) {
    if (next.startsWith("/einladung/")) {
      return next;
    }
    return EMAIL_CONFIRM_SUCCESS_PATH;
  }

  return next;
}

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

  const destination = resolvePostConfirmPath(typeRaw, next);
  let response = NextResponse.redirect(new URL(destination, origin));
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

  const userId = data.user?.id ?? data.session?.user?.id;
  if (userId) {
    try {
      const claimResult = await completePendingClaimForUser(userId);
      if (claimResult?.status === "error") {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", claimResult.message);
        return copyCookies(NextResponse.redirect(loginUrl));
      }
    } catch {
      /* optional */
    }
  }

  return copyCookies(
    NextResponse.redirect(new URL(resolvePostConfirmPath(typeRaw, next), origin)),
  );
}
