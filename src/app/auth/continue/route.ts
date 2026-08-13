import { NextResponse, type NextRequest } from "next/server";

import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import { createClient } from "@/lib/supabase/server";

/**
 * Post-auth hop: resolve the owner's vehicle dashboard on a fresh request
 * (cookies already committed). Not rate-limited — brute-force protection
 * lives on password/MFA routes; this only redirects signed-in users.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/auth/continue");
    login.searchParams.set("error", "session");
    return NextResponse.redirect(login);
  }

  const path = await resolvePostLoginPath(user.id);
  return NextResponse.redirect(new URL(path, request.url));
}
