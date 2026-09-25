import { NextResponse, type NextRequest } from "next/server";

import { processDueUnclaimedTagReminderEmails } from "@/lib/email/unclaimed-tag-reminders";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";

/**
 * GET /api/cron/unclaimed-tag-reminders
 * Nudges confirmed accounts without an active vehicle tag (day 3 and day 7).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueUnclaimedTagReminderEmails(60);
  return NextResponse.json({ ok: true, ...result });
}
