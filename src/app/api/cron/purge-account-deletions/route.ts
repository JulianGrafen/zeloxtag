import { NextResponse, type NextRequest } from "next/server";

import { purgeDueAccounts } from "@/lib/account/purge-user-account";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim();
  return auth === `Bearer ${secret}`;
}

/**
 * GET /api/cron/purge-account-deletions
 * Daily purge of accounts past the 30-day deletion grace window.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const results = await purgeDueAccounts(50);
  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}
