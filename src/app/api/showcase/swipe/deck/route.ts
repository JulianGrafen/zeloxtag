import { NextResponse, type NextRequest } from "next/server";

import { loadShowcaseSwipeDeck } from "@/lib/showcase/swipe-deck";
import {
  enforceRateLimit,
  requireApiUser,
} from "@/lib/security/api-guard";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/showcase/swipe/deck
 * Authenticated swipe candidates (public showcase fields only).
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "showcaseSwipe", "deck");
  if (limited) return limited;

  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const perUser = await rateLimit({
    key: `showcase-swipe-deck:${auth.user.id}`,
    limit: RATE_LIMITS.showcaseSwipe.limit,
    windowMs: RATE_LIMITS.showcaseSwipe.windowMs,
  });
  if (!perUser.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen.", code: "rate_limited" },
      { status: 429 },
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit =
    limitParam != null ? Math.min(30, Math.max(1, Number(limitParam) || 15)) : 15;

  try {
    const cards = await loadShowcaseSwipeDeck(limit);
    return NextResponse.json({ ok: true, cards });
  } catch (error) {
    console.error("[showcase-swipe/deck]", error);
    return NextResponse.json(
      { ok: false, error: "Deck konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
