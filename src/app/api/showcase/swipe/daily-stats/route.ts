import { NextResponse, type NextRequest } from "next/server";

import { loadVehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats";
import {
  enforceRateLimit,
  requireApiUser,
} from "@/lib/security/api-guard";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/showcase/swipe/daily-stats?vehicleId=
 * Today's swipe stats for an eligible owner vehicle (Europe/Berlin).
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "showcaseSwipe", "daily-stats");
  if (limited) return limited;

  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const perUser = await rateLimit({
    key: `showcase-swipe-daily-stats:${auth.user.id}`,
    limit: RATE_LIMITS.showcaseSwipe.limit,
    windowMs: RATE_LIMITS.showcaseSwipe.windowMs,
  });
  if (!perUser.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen.", code: "rate_limited" },
      { status: 429 },
    );
  }

  const vehicleId = request.nextUrl.searchParams.get("vehicleId");

  try {
    const stats = await loadVehicleShowcaseSwipeDailyStats(vehicleId);
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error("[showcase-swipe/daily-stats]", error);
    return NextResponse.json(
      { ok: false, error: "Swipe-Statistik konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
