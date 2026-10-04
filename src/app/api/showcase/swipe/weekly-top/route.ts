import { NextResponse, type NextRequest } from "next/server";

import { loadWeeklyTopBuilds } from "@/lib/showcase/weekly-top-builds";
import {
  enforceRateLimit,
  requireApiUser,
} from "@/lib/security/api-guard";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/showcase/swipe/weekly-top
 * Top builds by likes in the last 7 days.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "showcaseSwipe", "weekly-top");
  if (limited) return limited;

  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const perUser = await rateLimit({
    key: `showcase-swipe-weekly:${auth.user.id}`,
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
    limitParam != null ? Math.min(10, Math.max(1, Number(limitParam) || 10)) : 10;

  try {
    const builds = await loadWeeklyTopBuilds(limit);
    return NextResponse.json({ ok: true, builds });
  } catch (error) {
    console.error("[showcase-swipe/weekly-top]", error);
    return NextResponse.json(
      { ok: false, error: "Rangliste konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
