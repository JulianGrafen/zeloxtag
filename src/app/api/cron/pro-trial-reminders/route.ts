import { NextResponse, type NextRequest } from "next/server";

import { processDueProTrialReminderEmails } from "@/lib/email/pro-trial-reminders";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";

/**
 * GET /api/cron/pro-trial-reminders
 * Sends day-7 and day-12 Pro trial nudges (Resend).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueProTrialReminderEmails(60);
  return NextResponse.json({ ok: true, ...result });
}
