import { NextResponse, type NextRequest } from "next/server";

import { applyStaticSecurityHeaders } from "@/lib/security/csp";
import {
  isDemoOrShowcasePath,
  isGenericPostLoginNext,
  sanitizePostLoginPath,
} from "@/lib/auth/post-login-path";
import {
  isProtectedApiPath,
  isProtectedPagePath,
  isPublicVehicleImagePath,
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
function secureRedirect(url: URL | string): NextResponse {
  return applyStaticSecurityHeaders(NextResponse.redirect(url));
}

function secureJson(
  body: Record<string, unknown>,
  init: { status: number },
): NextResponse {
  return applyStaticSecurityHeaders(NextResponse.json(body, init));
}

export async function proxy(request: NextRequest) {
  const { pathname, search, origin } = request.nextUrl;
  const host = request.nextUrl.hostname;

  // Never finish OAuth on a *.vercel.app alias — PKCE cookies + redirects must stay canonical.
  if (host.endsWith(".vercel.app")) {
    const authEntryPaths = new Set([
      "/auth/callback",
      "/auth/confirm",
    ]);
    if (authEntryPaths.has(pathname)) {
      const canonical = new URL(`https://app.zeloxtag.de${pathname}${search}`);
      return secureRedirect(canonical);
    }
  }

  const { isConfigured } = getSupabaseEnv();
  const { response, userId, needsMfa } = await updateSession(request);

  // Without Supabase env, skip auth redirects (local static/demo only).
  if (!isConfigured) {
    return response;
  }

  const method = request.method.toUpperCase();

  // Vehicle PNG proxies — public digital-twin imagery (never auth-gated).
  if (isPublicVehicleImagePath(pathname, method)) {
    return response;
  }

  const requiresAuth =
    isProtectedPagePath(pathname) ||
    isProtectedApiPath(pathname, method) ||
    pathname.startsWith("/api/protected");

  if (requiresAuth && !userId) {
    if (pathname.startsWith("/api/")) {
      return secureJson(
        { ok: false, error: "Authentication required.", code: "unauthorized" },
        { status: 401 },
      );
    }
    return secureRedirect(loginRedirectUrl(origin, pathname, search));
  }

  // Password-recovery session must reach update-password before MFA step-up.
  const mfaExemptPath =
    pathname === "/login/mfa" ||
    pathname === "/login/update-password" ||
    pathname === "/login/reset" ||
    pathname === "/auth/callback" ||
    pathname === "/auth/confirm";

  // MFA enrolled → finish TOTP challenge before accessing protected surfaces.
  if (
    userId &&
    needsMfa &&
    !mfaExemptPath &&
    (requiresAuth || pathname.startsWith("/dashboard"))
  ) {
    if (pathname.startsWith("/api/")) {
      return secureJson(
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
    return secureRedirect(mfaUrl);
  }

  // Password session at AAL1 with enrolled TOTP → MFA challenge UI.
  if (userId && needsMfa && (pathname === "/" || pathname === "/login")) {
    const mfaUrl = new URL("/login/mfa", origin);
    mfaUrl.searchParams.set("next", "/auth/continue");
    return secureRedirect(mfaUrl);
  }

  // Authenticated users who finished MFA → own vehicle dashboard (via continue).
  // Keep reset / update-password reachable during recovery.
  if (
    userId &&
    !needsMfa &&
    (pathname === "/" || pathname === "/login" || pathname === "/login/mfa")
  ) {
    const next = request.nextUrl.searchParams.get("next");
    if (
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !isGenericPostLoginNext(next)
    ) {
      return secureRedirect(new URL(sanitizePostLoginPath(next), origin));
    }
    return secureRedirect(new URL("/auth/continue", origin));
  }

  // Logged-in users should never browse public showcase surfaces.
  if (userId && !needsMfa && isDemoOrShowcasePath(pathname)) {
    return secureRedirect(new URL("/auth/continue", origin));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and image optimization.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm|mjs|onnx)$).*)",
  ],
};
