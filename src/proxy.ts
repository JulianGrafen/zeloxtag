import { NextResponse, type NextRequest } from "next/server";

import {
  isProtectedApiPath,
  isProtectedPagePath,
  loginRedirectUrl,
} from "@/lib/security/route-policy";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (replaces deprecated middleware.ts).
 * — Refreshes Supabase session cookies (HttpOnly / Secure / SameSite=Lax)
 * — Gates /dashboard, owner hubs, and /api/* behind authentication
 * — Forces MFA step-up when TOTP is enrolled but session is still AAL1
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, origin } = request.nextUrl;
  const { isConfigured } = getSupabaseEnv();
  const { response, userId, needsMfa } = await updateSession(request);

  // Without Supabase env, skip auth redirects (local static/demo only).
  if (!isConfigured) {
    return response;
  }

  const method = request.method.toUpperCase();
  const requiresAuth =
    isProtectedPagePath(pathname) || isProtectedApiPath(pathname, method);

  if (requiresAuth && !userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Authentication required.", code: "unauthorized" },
        { status: 401 },
      );
    }
    return NextResponse.redirect(loginRedirectUrl(origin, pathname, search));
  }

  // MFA enrolled → finish TOTP challenge before accessing protected surfaces.
  if (
    userId &&
    needsMfa &&
    pathname !== "/login/mfa" &&
    !pathname.startsWith("/auth/") &&
    (requiresAuth || pathname.startsWith("/dashboard"))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Multi-factor authentication required.",
          code: "mfa_required",
        },
        { status: 401 },
      );
    }
    const mfaUrl = new URL("/login/mfa", origin);
    mfaUrl.searchParams.set(
      "next",
      `${pathname}${search}`.startsWith("/") ? `${pathname}${search}` : "/dashboard",
    );
    return NextResponse.redirect(mfaUrl);
  }

  // Password session at AAL1 with enrolled TOTP → MFA challenge UI.
  if (userId && needsMfa && pathname === "/login") {
    const mfaUrl = new URL("/login/mfa", origin);
    mfaUrl.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(mfaUrl);
  }

  // Authenticated users who finished MFA leave the login screens.
  if (userId && !needsMfa && (pathname === "/login" || pathname === "/login/mfa")) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and image optimization.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
