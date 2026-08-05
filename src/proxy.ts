import { NextResponse, type NextRequest } from "next/server";

import {
  isProtectedApiPath,
  isProtectedPagePath,
  loginRedirectUrl,
} from "@/lib/security/route-policy";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy — Zero-Trust edge gate (replaces deprecated middleware.ts).
 * — Refreshes Supabase session cookies (HttpOnly / Secure / SameSite=Lax)
 * — NEVER stores access tokens in localStorage
 * — Gates /dashboard, /settings, /api/protected, and other owner APIs
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
    isProtectedPagePath(pathname) ||
    isProtectedApiPath(pathname, method) ||
    pathname.startsWith("/api/protected");

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
    pathname !== "/auth/callback" &&
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
      `${pathname}${search}`.startsWith("/")
        ? `${pathname}${search}`
        : "/auth/continue",
    );
    return NextResponse.redirect(mfaUrl);
  }

  // Password session at AAL1 with enrolled TOTP → MFA challenge UI.
  if (userId && needsMfa && (pathname === "/" || pathname === "/login")) {
    const mfaUrl = new URL("/login/mfa", origin);
    mfaUrl.searchParams.set("next", "/auth/continue");
    return NextResponse.redirect(mfaUrl);
  }

  // Authenticated users who finished MFA → own vehicle dashboard (via continue).
  if (
    userId &&
    !needsMfa &&
    (pathname === "/" || pathname === "/login" || pathname === "/login/mfa")
  ) {
    return NextResponse.redirect(new URL("/auth/continue", origin));
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
