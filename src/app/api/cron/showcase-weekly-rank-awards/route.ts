import { NextResponse, type NextRequest } from "next/server";

import { processWeeklyShowcaseRankAwards } from "@/lib/showcase/process-weekly-rank-awards";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";

/**
 * GET /api/cron/showcase-weekly-rank-awards
 * Sunday close: notify swipe leaderboard ranks 1–3 (email + in-app award).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processWeeklyShowcaseRankAwards({ limit: 3 });
  return NextResponse.json({ ok: true, ...result });
}
