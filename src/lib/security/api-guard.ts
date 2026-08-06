import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  authClientKeyFromHeaders,
  clientIpFromHeaders,
  rateLimit,
  RATE_LIMITS,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import { getSupabaseEnv } from "@/lib/supabase/env";

type RateBucket = keyof typeof RATE_LIMITS;

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: "Too many requests. Please retry later.",
      code: "rate_limited",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

export async function enforceRateLimit(
  request: NextRequest,
  bucket: RateBucket,
  scope: string,
): Promise<NextResponse | null> {
  try {
    const cfg = RATE_LIMITS[bucket];
    const memoryOnly = bucket === "auth";
    const clientKey = memoryOnly
      ? authClientKeyFromHeaders(request.headers)
      : clientIpFromHeaders(request.headers);
    const result = await rateLimit({
      key: `${bucket}:${scope}:${clientKey}`,
      limit: cfg.limit,
      windowMs: cfg.windowMs,
      memoryOnly,
    });
    if (!result.ok) return rateLimitResponse(result);
    return null;
  } catch (error) {
    console.error("[api-guard] rate limit skipped", error);
    return null;
  }
}

/**
 * CSRF defense-in-depth for browser-initiated mutating API routes.
 * Allows missing Origin for same-site non-browser clients only when
 * Sec-Fetch-Site is `same-origin` / `none` or Host matches.
 */
export function enforceSameOrigin(
  request: NextRequest,
): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const allowed = new Set<string>();
  allowed.add(request.nextUrl.origin);
  allowed.add("https://app.zeloxtag.de");

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) {
    try {
      allowed.add(new URL(site).origin);
    } catch {
      /* ignore bad SITE_URL */
    }
  }

  if (origin) {
    if (!allowed.has(origin)) {
      return NextResponse.json(
        { ok: false, error: "Origin not allowed.", code: "forbidden_origin" },
        { status: 403 },
      );
    }
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "none") {
    return null;
  }

  // iOS Safari / WebViews sometimes omit Origin on same-site XHR — allow matching Referer.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (allowed.has(new URL(referer).origin)) {
        return null;
      }
    } catch {
      /* ignore malformed referer */
    }
  }

  const host = request.headers.get("host");
  if (host && host === request.nextUrl.host && fetchSite === "same-site") {
    return null;
  }

  // No Origin and not clearly same-origin — reject mutating calls.
  return NextResponse.json(
    { ok: false, error: "Origin required.", code: "forbidden_origin" },
    { status: 403 },
  );
}

export type ApiAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Require an authenticated Supabase user for API routes.
 * When Supabase env is missing (local mock), returns 503 — never an open API.
 */
export async function requireApiUser(): Promise<ApiAuthResult> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Supabase is not configured.",
          code: "config",
        },
        { status: 503 },
      ),
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Authentication required.",
          code: "unauthorized",
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true, user };
}
