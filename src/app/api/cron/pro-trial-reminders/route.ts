import { NextResponse, type NextRequest } from "next/server";

import { processDueProTrialReminderEmails } from "@/lib/email/pro-trial-reminders";

export const runtime = "nodejs";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim();
  return auth === `Bearer ${secret}`;
}

/**
 * GET /api/cron/pro-trial-reminders
 * Sends day-7 and day-12 Pro trial nudges (Resend).
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueProTrialReminderEmails(60);
  return NextResponse.json({ ok: true, ...result });
}
