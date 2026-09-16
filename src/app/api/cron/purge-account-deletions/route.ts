import { NextResponse, type NextRequest } from "next/server";

import { purgeDueAccounts } from "@/lib/account/purge-user-account";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/purge-account-deletions
 * Daily purge of accounts past the 30-day deletion grace window.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const results = await purgeDueAccounts(50);
  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}
