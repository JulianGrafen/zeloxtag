import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { completePendingClaim } from "@/actions/claim-tag";

/**
 * OAuth / Magic Link PKCE callback.
 * Exchanges `code` for a session, then completes any pending tag claim.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    const claimResult = await completePendingClaim();
    if (claimResult?.status === "claimed") {
      return NextResponse.redirect(`${origin}/v/${claimResult.tagUuid}`);
    }
    if (claimResult?.status === "error") {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", claimResult.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
