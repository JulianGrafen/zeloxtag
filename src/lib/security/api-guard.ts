import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  clientIpFromHeaders,
  rateLimit,
  RATE_LIMITS,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { User } from "@supabase/supabase-js";

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

export function enforceRateLimit(
  request: NextRequest,
  bucket: RateBucket,
  scope: string,
): NextResponse | null {
  const ip = clientIpFromHeaders(request.headers);
  const cfg = RATE_LIMITS[bucket];
  const result = rateLimit({
    key: `${bucket}:${scope}:${ip}`,
    limit: cfg.limit,
    windowMs: cfg.windowMs,
  });
  if (!result.ok) return rateLimitResponse(result);
  return null;
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
