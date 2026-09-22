import { NextResponse, type NextRequest } from "next/server";

import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";
import { recordShowcaseSwipe } from "@/lib/showcase/swipe-record";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/showcase/swipe
 * Body: { publicSlug, decision: 'like' | 'pass' }
 */
export async function POST(request: NextRequest) {
  const originBlock = enforceSameOrigin(request);
  if (originBlock) return originBlock;

  const limited = await enforceRateLimit(request, "showcaseSwipe", "swipe");
  if (limited) return limited;

  const auth = await requireWritableApiUser();
  if (!auth.ok) return auth.response;

  const perUser = await rateLimit({
    key: `showcase-swipe:${auth.user.id}`,
    limit: RATE_LIMITS.showcaseSwipe.limit,
    windowMs: RATE_LIMITS.showcaseSwipe.windowMs,
  });
  if (!perUser.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Swipes.", code: "rate_limited" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiger Request-Body." },
      { status: 400 },
    );
  }

  const payload =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  const result = await recordShowcaseSwipe({
    publicSlug:
      typeof payload.publicSlug === "string" ? payload.publicSlug : "",
    decision: payload.decision,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, decision: result.decision });
}
